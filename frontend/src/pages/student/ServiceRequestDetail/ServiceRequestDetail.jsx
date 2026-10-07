import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchStudentServiceRequestById, sendStudentServiceMessage, acceptStudentServiceQuotation, declineStudentServiceQuotation } from '../../../services/cadService.js'

function ServiceRequestDetail() {
  const { enquiryId } = useParams()
  const [data, setData] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchStudentServiceRequestById(enquiryId)
      setData(result)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load this request.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [enquiryId])

  const handleMessageSubmit = async (event) => {
    event.preventDefault()
    if (!message.trim()) return
    try {
      await sendStudentServiceMessage(enquiryId, message)
      setMessage('')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send message.')
    }
  }

  const handleAccept = async () => {
    try {
      await acceptStudentServiceQuotation(enquiryId)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to accept the quotation.')
    }
  }

  const handleDecline = async () => {
    const reason = window.prompt('Tell us why you are declining this quotation?') || ''
    try {
      await declineStudentServiceQuotation(enquiryId, reason)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to decline the quotation.')
    }
  }

  if (loading) return <main className="page-placeholder"><h1>Loading request...</h1></main>
  if (!data?.enquiry) return <main className="page-placeholder"><h1>Request not found</h1><Link className="button button-primary" to="/student/service-requests">Back to service requests</Link></main>

  const { enquiry, service, activeQuotation, messages = [] } = data

  return (
    <main className="student-content-area" style={{ padding: '2rem 0' }}>
      <div className="site-container">
        <nav className="service-breadcrumb" aria-label="Breadcrumb">
          <Link to="/student/service-requests">My Service Requests</Link>
          <span>/</span>
          <span aria-current="page">{enquiry.referenceNumber}</span>
        </nav>

        <section className="service-detail-section">
          <div className="service-detail-section-heading">
            <span className="categories-eyebrow">REQUEST</span>
            <h2 className="section-heading">{enquiry.projectTitle}</h2>
          </div>
          <p>{enquiry.projectDescription}</p>
          <div className="download-meta-grid">
            <div><label>Status</label><strong>{enquiry.status}</strong></div>
            <div><label>Customer</label><strong>{enquiry.customerName}</strong></div>
            <div><label>Budget</label><strong>{enquiry.budgetInPaise ? `₹${(enquiry.budgetInPaise / 100).toFixed(2)}` : 'Flexible'}</strong></div>
            <div><label>Service</label><strong>{service?.title || 'Custom CAD service'}</strong></div>
          </div>
        </section>

        {activeQuotation && (
          <section className="service-detail-section">
            <div className="service-detail-section-heading">
              <span className="categories-eyebrow">QUOTE</span>
              <h2 className="section-heading">Active quotation</h2>
            </div>
            <div className="download-card-body">
              <div className="download-card-topline">
                <span>Version {activeQuotation.version}</span>
                <span>Valid until {new Date(activeQuotation.validUntil).toLocaleDateString()}</span>
              </div>
              <h3>₹{(activeQuotation.amountInPaise / 100).toFixed(2)}</h3>
              <p>{activeQuotation.scopeOfWork}</p>
              <div className="download-actions">
                <button type="button" className="button button-primary" onClick={handleAccept}><CheckCircle2 size={16} /> Accept Quote</button>
                <button type="button" className="button button-outline" onClick={handleDecline}><XCircle size={16} /> Decline Quote</button>
              </div>
            </div>
          </section>
        )}

        <section className="service-detail-section">
          <div className="service-detail-section-heading">
            <span className="categories-eyebrow">MESSAGES</span>
            <h2 className="section-heading">Project conversation</h2>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {messages.length === 0 ? <p>No messages yet.</p> : messages.map((entry) => (
              <div key={entry._id || entry.id} className="download-card-body">
                <strong>{entry.senderRole === 'admin' ? 'CadTech Team' : 'You'}</strong>
                <p>{entry.message}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleMessageSubmit} style={{ marginTop: '1rem' }}>
            {error && <p className="admin-error" role="alert">{error}</p>}
            <label>
              Add a message
              <textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share updates or questions..." />
            </label>
            <button type="submit" className="button button-primary">Send Message</button>
          </form>
        </section>

        <Link className="button button-outline" to="/student/service-requests"><ArrowLeft size={16} /> Back to requests</Link>
      </div>
    </main>
  )
}

export default ServiceRequestDetail
