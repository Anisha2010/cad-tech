import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useAuth from '../../context/useAuth.jsx'
import {
  assignAdminServiceEnquiry,
  createAdminServiceQuotation,
  fetchAdminServiceEnquiryById,
  sendAdminServiceMessage,
  sendAdminServiceQuotation,
  updateAdminServiceEnquiryStatus
} from '../../services/adminCadService.js'
import './AdminServiceRequests.css'

const statusTransitions = {
  submitted: ['under_review'],
  under_review: ['clarification_required', 'quoted'],
  clarification_required: ['under_review', 'quoted'],
  quoted: ['accepted', 'declined'],
  accepted: ['in_progress'],
  declined: [],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
}

const emptyQuotation = () => ({ amount: '', scopeOfWork: '', deliverables: '', estimatedDeliveryDays: '', terms: '', validUntil: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) })
const getErrorMessage = (error) => error.response?.data?.message || error.message || 'Unable to update this service request.'
const formatStatus = (status = '') => status.replaceAll('_', ' ')
const formatDate = (value) => value ? new Date(value).toLocaleString() : '-'

function AdminServiceRequestDetail() {
  const { enquiryId } = useParams()
  const { user } = useAuth()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [quotation, setQuotation] = useState(emptyQuotation)

  useEffect(() => {
    let active = true
    fetchAdminServiceEnquiryById(enquiryId)
      .then((result) => {
        if (active) setRecord(result)
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load this service request.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [enquiryId, reload])

  const refreshRecord = async () => {
    const result = await fetchAdminServiceEnquiryById(enquiryId)
    setRecord(result)
  }

  const runAction = async (key, action, successText) => {
    setBusy(key)
    setError('')
    setNotice('')
    try {
      await action()
      await refreshRecord()
      setNotice(successText)
      return true
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      return false
    } finally {
      setBusy('')
    }
  }

  const handleStatusChange = (nextStatus) => {
    if (!nextStatus || nextStatus === record?.enquiry?.status) return
    runAction('status', () => updateAdminServiceEnquiryStatus(enquiryId, nextStatus), `Status changed to ${formatStatus(nextStatus)}.`)
  }

  const currentUserId = String(user?.id || user?._id || '')
  const assigneeValue = record?.enquiry?.adminAssignedTo
  const assignedId = String(assigneeValue?._id || assigneeValue || '')
  const assignedToCurrentUser = Boolean(currentUserId && assignedId === currentUserId)

  const handleAssignment = () => {
    if (!currentUserId) {
      setError('Your admin account could not be identified for assignment.')
      return
    }
    const nextAssignee = assignedToCurrentUser ? null : currentUserId
    runAction('assignment', () => assignAdminServiceEnquiry(enquiryId, nextAssignee), assignedToCurrentUser ? 'Request unassigned.' : 'Request assigned to you.')
  }

  const handleMessage = async (event) => {
    event.preventDefault()
    if (!message.trim() || message.trim().length > 4000) {
      setError('Message must contain between 1 and 4000 characters.')
      return
    }
    const sent = await runAction('message', () => sendAdminServiceMessage(enquiryId, message.trim()), 'Message added to the request.')
    if (sent) setMessage('')
  }

  const handleQuotation = async (event) => {
    event.preventDefault()
    const amount = Number(quotation.amount)
    const days = Number(quotation.estimatedDeliveryDays)
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
      setError('Enter a positive quotation amount with no more than two decimal places.')
      return
    }
    if (!Number.isInteger(days) || days < 1) {
      setError('Estimated delivery must be a whole number of at least one day.')
      return
    }
    const payload = {
      amountInPaise: Math.round(amount * 100),
      scopeOfWork: quotation.scopeOfWork.trim(),
      deliverables: quotation.deliverables.split('\n').map((line) => line.trim()).filter(Boolean),
      estimatedDeliveryDays: days,
      terms: quotation.terms.split('\n').map((line) => line.trim()).filter(Boolean),
      validUntil: quotation.validUntil
    }
    const created = await runAction('quotation', () => createAdminServiceQuotation(enquiryId, payload), 'Quotation draft created.')
    if (created) setQuotation(emptyQuotation())
  }

  if (loading) return <main className="admin-service-request-detail"><p className="admin-state" aria-live="polite">Loading service request...</p></main>
  if (!record?.enquiry) return <main className="admin-service-request-detail"><div className="admin-error" role="alert"><span>{error || 'Service request not found.'}</span><button type="button" className="button button-outline" onClick={() => { setLoading(true); setError(''); setReload((value) => value + 1) }}>Retry</button></div></main>

  const { enquiry, service, messages = [], quotations = [], activeQuotation } = record
  const attachments = Array.isArray(enquiry.attachments) ? enquiry.attachments : []

  return (
    <main className="admin-page admin-service-request-detail">
      <header className="admin-page-header">
        <div><p className="admin-kicker">CUSTOM WORK / {enquiry.referenceNumber || 'REQUEST'}</p><h1>{enquiry.projectTitle}</h1><p>{service?.title || 'CAD Service Request'} · {enquiry.referenceNumber || enquiryId}</p></div>
        <Link to="/admin/service-requests" className="button button-outline">Back to requests</Link>
      </header>

      {error && <p className="admin-error" role="alert">{error}</p>}
      {notice && <p className="admin-service-request-notice" role="status">{notice}</p>}

      <div className="admin-service-request-grid">
        <section className="admin-service-request-panel">
          <h2>Request details</h2>
          <dl className="admin-service-request-facts">
            <div><dt>Customer</dt><dd>{enquiry.customerName}<small>{enquiry.customerEmail}</small></dd></div>
            <div><dt>Phone</dt><dd>{enquiry.customerPhone || 'Not provided'}</dd></div>
            <div><dt>Status</dt><dd>{formatStatus(enquiry.status)}</dd></div>
            <div><dt>Submitted</dt><dd>{formatDate(enquiry.createdAt)}</dd></div>
            <div><dt>Preferred software</dt><dd>{enquiry.preferredSoftware || 'Not specified'}</dd></div>
            <div><dt>Expected delivery</dt><dd>{formatDate(enquiry.expectedDeliveryDate)}</dd></div>
            <div><dt>Budget</dt><dd>{Number.isInteger(enquiry.budgetInPaise) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(enquiry.budgetInPaise / 100) : 'Not specified'}</dd></div>
            <div><dt>Assigned</dt><dd>{assignedToCurrentUser ? 'You' : assignedId || 'Unassigned'}</dd></div>
          </dl>
          <h3>Project description</h3><p className="admin-request-description">{enquiry.projectDescription}</p>
          {Array.isArray(enquiry.requiredFileFormats) && enquiry.requiredFileFormats.length > 0 && <p><strong>Required formats:</strong> {enquiry.requiredFileFormats.join(', ')}</p>}
          {attachments.length > 0 && <><h3>Attachments</h3><ul>{attachments.map((file) => <li key={file._id || file.storageAssetId}>{file.originalFileName} ({Math.ceil(Number(file.sizeBytes || 0) / 1024)} KB)</li>)}</ul></>}
        </section>

        <section className="admin-service-request-panel">
          <h2>Workflow</h2>
          <label className="admin-service-request-field">Change status<select value={enquiry.status} onChange={(event) => handleStatusChange(event.target.value)} disabled={Boolean(busy)}>
            <option value={enquiry.status}>{formatStatus(enquiry.status)}</option>
            {(statusTransitions[enquiry.status] || []).map((next) => <option key={next} value={next}>{formatStatus(next)}</option>)}
          </select></label>
          <button type="button" className="button button-outline" onClick={handleAssignment} disabled={Boolean(busy)}>{busy === 'assignment' ? 'Updating...' : assignedToCurrentUser ? 'Unassign from me' : 'Assign to me'}</button>
          <h3>Messages</h3>
          <div className="admin-service-request-messages">
            {messages.length ? messages.map((entry) => <article key={entry._id || `${entry.createdAt}-${entry.message}`}><p>{entry.message}</p><small>{entry.senderRole === 'admin' ? 'Admin' : 'Customer'} · {formatDate(entry.createdAt)}</small></article>) : <p className="admin-empty">No messages yet.</p>}
          </div>
          <form className="admin-service-request-form" onSubmit={handleMessage}>
            <label>Message<textarea required maxLength="4000" rows="3" value={message} onChange={(event) => setMessage(event.target.value)} /></label>
            <button className="button button-primary" type="submit" disabled={Boolean(busy) || !message.trim()}>{busy === 'message' ? 'Sending...' : 'Add message'}</button>
          </form>
        </section>
      </div>

      <section className="admin-service-request-panel admin-service-quotations">
        <h2>Quotations</h2>
        {quotations.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Version</th><th>Amount</th><th>Delivery</th><th>Valid until</th><th>Status</th><th>Action</th></tr></thead><tbody>{quotations.map((item) => <tr key={item._id}><td>{item.version}</td><td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: item.currency || 'INR' }).format(item.amountInPaise / 100)}</td><td>{item.estimatedDeliveryDays} days</td><td>{formatDate(item.validUntil)}</td><td>{formatStatus(item.status)}</td><td>{item.status === 'draft' && <button type="button" className="button button-outline" onClick={() => runAction(`send-${item._id}`, () => sendAdminServiceQuotation(enquiryId, item._id), 'Quotation sent to the customer.')} disabled={Boolean(busy)}>{busy === `send-${item._id}` ? 'Sending...' : 'Send quotation'}</button>}</td></tr>)}</tbody></table></div> : <p className="admin-empty">No quotations have been created.</p>}
        {activeQuotation && <p className="admin-active-quotation">Active quotation: version {activeQuotation.version}, valid until {new Date(activeQuotation.validUntil).toLocaleDateString()}.</p>}

        {!['completed', 'cancelled'].includes(enquiry.status) && <form className="admin-service-request-form admin-quotation-form" onSubmit={handleQuotation}>
          <h3>Create quotation draft</h3>
          <div className="admin-service-request-form-grid">
            <label>Amount (INR) *<input type="number" required min="0.01" step="0.01" value={quotation.amount} onChange={(event) => setQuotation((current) => ({ ...current, amount: event.target.value }))} /></label>
            <label>Estimated delivery days *<input type="number" required min="1" step="1" value={quotation.estimatedDeliveryDays} onChange={(event) => setQuotation((current) => ({ ...current, estimatedDeliveryDays: event.target.value }))} /></label>
            <label>Valid until *<input type="date" required min={new Date().toISOString().slice(0, 10)} value={quotation.validUntil} onChange={(event) => setQuotation((current) => ({ ...current, validUntil: event.target.value }))} /></label>
            <label className="is-wide">Scope of work *<textarea required minLength="20" rows="3" value={quotation.scopeOfWork} onChange={(event) => setQuotation((current) => ({ ...current, scopeOfWork: event.target.value }))} /></label>
            <label>Deliverables, one per line<textarea rows="3" value={quotation.deliverables} onChange={(event) => setQuotation((current) => ({ ...current, deliverables: event.target.value }))} /></label>
            <label>Terms, one per line<textarea rows="3" value={quotation.terms} onChange={(event) => setQuotation((current) => ({ ...current, terms: event.target.value }))} /></label>
          </div>
          <button type="submit" className="button button-primary" disabled={Boolean(busy)}>{busy === 'quotation' ? 'Creating...' : 'Create draft'}</button>
        </form>}
      </section>
    </main>
  )
}

export default AdminServiceRequestDetail