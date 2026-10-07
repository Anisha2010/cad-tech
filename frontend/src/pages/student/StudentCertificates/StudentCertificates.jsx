import { Award, Download, Eye, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StudentSidebar from '../../../components/student/StudentSidebar/StudentSidebar.jsx'
import StudentTopbar from '../../../components/student/StudentTopbar/StudentTopbar.jsx'
import { getStudentCertificates } from '../../../services/certificateService.js'

function StudentCertificates() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const loadCertificates = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getStudentCertificates()
      const certificates = Array.isArray(response?.certificates) ? response.certificates : []
      setItems(certificates)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load certificates.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCertificates()
  }, [])

  return (
    <div className="student-dashboard-shell">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="student-dashboard-main">
        <StudentTopbar onMenuToggle={() => setSidebarOpen((open) => !open)} isSidebarOpen={sidebarOpen} />
        <main className="student-content-area">
          <section className="welcome-section">
            <div>
              <p className="welcome-kicker">Achievements</p>
              <h2>My Certificates</h2>
              <p className="welcome-description">View, download, and verify the certificates you have earned.</p>
            </div>
            <button type="button" className="button button-outline" onClick={loadCertificates}>
              <RefreshCw size={16} /> Refresh
            </button>
          </section>

          {loading && <div className="dashboard-skeleton" role="status">Loading certificates...</div>}
          {error && <div className="dashboard-error" role="alert"><strong>{error}</strong></div>}

          {!loading && !error && (
            <section className="student-panel">
              {items.length === 0 ? (
                <div className="empty-state">
                  <Award size={28} aria-hidden="true" />
                  <h3>No certificates yet</h3>
                  <p>Complete a course and earn a certificate to see it here.</p>
                  <Link className="button button-primary" to="/student/my-courses">View my courses</Link>
                </div>
              ) : (
                <div className="student-card-grid">
                  {items.map((certificate) => (
                    <article key={certificate.id} className="student-card">
                      <div className="card-body">
                        <div className="card-topline">
                          <span>Certificate</span>
                          <span>{certificate.status === 'revoked' ? 'Revoked' : 'Active'}</span>
                        </div>
                        <h4>{certificate.courseTitleSnapshot}</h4>
                        <p className="welcome-description">Issued: {new Date(certificate.issuedAt).toLocaleDateString()}</p>
                        <p className="welcome-description">Number: {certificate.certificateNumber}</p>
                        <div className="student-card-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                          <Link className="button button-primary" to={`/student/certificates/${certificate.id}`}><Eye size={16} /> Details</Link>
                          <a className="button button-outline" href={`/student/certificates/${certificate.id}/download`} target="_blank" rel="noreferrer"><Download size={16} /> Download</a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default StudentCertificates
