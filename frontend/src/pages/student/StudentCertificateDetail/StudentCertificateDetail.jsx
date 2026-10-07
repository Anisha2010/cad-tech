import { Award, Download, ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import StudentSidebar from '../../../components/student/StudentSidebar/StudentSidebar.jsx'
import StudentTopbar from '../../../components/student/StudentTopbar/StudentTopbar.jsx'
import { getStudentCertificate } from '../../../services/certificateService.js'

function StudentCertificateDetail() {
  const { certificateId } = useParams()
  const [certificate, setCertificate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const loadCertificate = async () => {
      setLoading(true)
      try {
        const result = await getStudentCertificate(certificateId)
        setCertificate(result?.certificate || null)
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Unable to load certificate details.')
      } finally {
        setLoading(false)
      }
    }

    loadCertificate()
  }, [certificateId])

  return (
    <div className="student-dashboard-shell">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="student-dashboard-main">
        <StudentTopbar onMenuToggle={() => setSidebarOpen((open) => !open)} isSidebarOpen={sidebarOpen} />
        <main className="student-content-area">
          <Link className="admin-back-link" to="/student/certificates"><ArrowLeft size={16} /> Back to certificates</Link>
          {loading && <div className="dashboard-skeleton" role="status">Loading certificate...</div>}
          {error && <div className="dashboard-error" role="alert"><strong>{error}</strong></div>}
          {!loading && certificate && (
            <section className="student-panel">
              <div className="panel-header">
                <h3>{certificate.courseTitleSnapshot}</h3>
                <span className={`status-pill ${certificate.status === 'revoked' ? 'danger' : 'success'}`}>{certificate.status === 'revoked' ? 'Revoked' : 'Valid'}</span>
              </div>
              <div className="student-content-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div className="student-card"><div className="card-body"><Award size={24} /><h4>Certificate Number</h4><p>{certificate.certificateNumber}</p></div></div>
                <div className="student-card"><div className="card-body"><Award size={24} /><h4>Verification Code</h4><p>{certificate.verificationCode}</p></div></div>
                <div className="student-card"><div className="card-body"><Award size={24} /><h4>Issued</h4><p>{new Date(certificate.issuedAt).toLocaleDateString()}</p></div></div>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a className="button button-primary" href={`/student/certificates/${certificate.id}/download`} target="_blank" rel="noreferrer"><Download size={16} /> Download PDF</a>
                <Link className="button button-outline" to="/student/certificates">View all</Link>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default StudentCertificateDetail
