import { useEffect, useState } from 'react'
import { getAdminContactEnquiries, updateAdminContactEnquiryStatus, updateAdminContactEnquiryNotes } from '../../services/siteContentService.js'

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'in_review', label: 'In review' },
  { value: 'responded', label: 'Responded' },
  { value: 'closed', label: 'Closed' },
  { value: 'spam', label: 'Spam' }
]

function AdminContactEnquiries() {
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadEnquiries = async () => {
    try {
      const response = await getAdminContactEnquiries()
      setEnquiries(response?.enquiries || [])
      setError('')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load contact enquiries.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEnquiries()
  }, [])

  const handleStatusChange = async (enquiryId, nextStatus) => {
    try {
      setError('')
      setSuccess('')
      await updateAdminContactEnquiryStatus(enquiryId, nextStatus)
      setEnquiries((current) => current.map((item) => item._id === enquiryId ? { ...item, status: nextStatus, isRead: true } : item))
      setSuccess('Enquiry status updated successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update enquiry.')
    }
  }

  const handleNotesChange = async (enquiryId, notes) => {
    try {
      setError('')
      setSuccess('')
      await updateAdminContactEnquiryNotes(enquiryId, notes)
      setEnquiries((current) => current.map((item) => item._id === enquiryId ? { ...item, adminNotes: notes } : item))
      setSuccess('Internal notes saved successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save notes.')
    }
  }

  if (loading) return <main className="admin-page"><p className="admin-state">Loading contact enquiries...</p></main>

  return (
    <main className="admin-page admin-form-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">WEBSITE</p>
          <h1>Contact Enquiries</h1>
          <p>Review new website submissions, update statuses, and keep internal follow-up notes.</p>
        </div>
      </header>

      <div className="admin-cad-panel">
        {error && <p className="admin-error" role="alert">{error}</p>}
        {success && <p className="admin-success" role="status">{success}</p>}

        {enquiries.length === 0 ? (
          <p className="admin-empty-state">No contact enquiries yet.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Name</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enquiry) => (
                  <tr key={enquiry._id}>
                    <td>{enquiry.referenceNumber || enquiry._id}</td>
                    <td>
                      <strong>{enquiry.name}</strong><br />
                      <small>{enquiry.email}</small>
                    </td>
                    <td>
                      <strong>{enquiry.subject}</strong><br />
                      <small>{enquiry.message}</small>
                    </td>
                    <td>
                      <select value={enquiry.status || 'new'} onChange={(event) => handleStatusChange(enquiry._id, event.target.value)}>
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <textarea
                        rows="3"
                        value={enquiry.adminNotes || ''}
                        onChange={(event) => handleNotesChange(enquiry._id, event.target.value)}
                        placeholder="Add private internal notes"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

export default AdminContactEnquiries
