import { Award, RefreshCw, ShieldCheck, ShieldX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchAdminCertificates, revokeAdminCertificate, reissueAdminCertificate } from '../../services/certificateService.js'

function AdminCertificates() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadCertificates = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetchAdminCertificates({ search, status, page: 1, limit: 20 })
      setItems(Array.isArray(response?.certificates) ? response.certificates : [])
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load certificates.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCertificates()
  }, [search, status])

  const handleRevoke = async (certificateId) => {
    const reason = window.prompt('Provide a short reason for revocation:')
    if (!reason || !reason.trim()) return
    try {
      setError('')
      await revokeAdminCertificate(certificateId, reason)
      setSuccess('Certificate revoked successfully.')
      await loadCertificates()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to revoke certificate.')
    }
  }

  const handleReissue = async (certificateId) => {
    try {
      setError('')
      await reissueAdminCertificate(certificateId)
      setSuccess('Certificate reissued successfully.')
      await loadCertificates()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to reissue certificate.')
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">CERTIFICATIONS</p>
          <h1>Certificate Management</h1>
          <p>Review issued certificates, verify status, and manage revocations.</p>
        </div>
        <button type="button" className="button button-outline" onClick={loadCertificates}><RefreshCw size={16} /> Refresh</button>
      </header>

      <section className="admin-panel" style={{ marginBottom: '1rem' }}>
        <div className="admin-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="admin-input" placeholder="Search by student, course, or number" aria-label="Search certificates" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="admin-input" aria-label="Filter certificate status">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
      </section>

      {loading && <p className="admin-status" aria-live="polite">Loading certificates...</p>}
      {error && <div className="admin-error-panel" role="alert"><p>{error}</p></div>}
      {success && <p className="admin-success" role="status">{success}</p>}

      {!loading && !error && (
        <section className="admin-panel">
          {items.length === 0 ? <p className="admin-empty">No certificates found.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Student</th><th>Course</th><th>Number</th><th>Status</th><th>Issued</th><th>Actions</th></tr></thead><tbody>{items.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.studentNameSnapshot || 'Student'}</strong></td>
              <td>{item.courseTitleSnapshot || '-'}</td>
              <td>{item.certificateNumber}</td>
              <td>{item.status === 'revoked' ? <span><ShieldX size={14} /> Revoked</span> : <span><ShieldCheck size={14} /> Active</span>}</td>
              <td>{new Date(item.issuedAt).toLocaleDateString()}</td>
              <td className="admin-actions">
                <button type="button" className="button button-secondary" onClick={() => handleReissue(item.id)}>Reissue</button>
                <button type="button" className="button button-outline" onClick={() => handleRevoke(item.id)}>Revoke</button>
              </td>
            </tr>
          ))}</tbody></table></div>}
        </section>
      )}
    </div>
  )
}

export default AdminCertificates
