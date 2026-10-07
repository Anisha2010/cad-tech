import { FileText, MessageSquare, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StudentSidebar from '../../../components/student/StudentSidebar/StudentSidebar.jsx'
import StudentTopbar from '../../../components/student/StudentTopbar/StudentTopbar.jsx'
import { fetchStudentServiceRequests } from '../../../services/cadService.js'

function ServiceRequests() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchStudentServiceRequests({ page: 1, limit: 20 })
      setItems(Array.isArray(data?.enquiries) ? data.enquiries : [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load your service requests.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="student-dashboard-shell">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="student-dashboard-main">
        <StudentTopbar onMenuToggle={() => setSidebarOpen((open) => !open)} isSidebarOpen={sidebarOpen} />
        <main className="student-content-area">
          <header className="my-downloads-header">
            <div>
              <p className="welcome-kicker">CUSTOM CAD CONSULTING</p>
              <h2>My Service Requests</h2>
              <p className="welcome-description">Track your CAD project enquiries and quote responses.</p>
            </div>
            <Link className="button button-primary" to="/cad-services">New Request</Link>
          </header>

          {loading && <div className="dashboard-skeleton">Loading requests...</div>}

          {!loading && error && (
            <div className="dashboard-error" role="alert">
              <div>
                <strong>{error}</strong>
                <p>Please try again shortly.</p>
              </div>
              <button type="button" className="button button-outline" onClick={load}><RefreshCw size={16} /> Retry</button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <section className="empty-state-panel">
              <FileText size={28} />
              <h3>No service requests yet</h3>
              <p>Your CAD service enquiries will appear here after you submit them.</p>
              <Link className="button button-primary" to="/cad-services">Browse CAD Services</Link>
            </section>
          )}

          {!loading && !error && items.length > 0 && (
            <section className="download-list">
              {items.map((item) => (
                <article className="download-card" key={item._id || item.id}>
                  <div className="download-card-body">
                    <div className="download-card-topline">
                      <span>{item.referenceNumber}</span>
                      <span>{item.status}</span>
                    </div>
                    <h3>{item.projectTitle}</h3>
                    <p>{item.projectDescription}</p>
                    <div className="download-meta-grid">
                      <div><label>Service</label><strong>{item.serviceId || 'Custom CAD Project'}</strong></div>
                      <div><label>Created</label><strong>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}</strong></div>
                      <div><label>Budget</label><strong>{item.budgetInPaise ? `₹${(item.budgetInPaise / 100).toFixed(2)}` : 'Flexible'}</strong></div>
                    </div>
                  </div>
                  <div className="download-actions">
                    <Link className="button button-outline" to={`/student/service-requests/${item._id || item.id}`}><MessageSquare size={16} /> View Details</Link>
                  </div>
                </article>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default ServiceRequests
