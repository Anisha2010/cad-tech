import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminServiceEnquiries } from '../../services/adminCadService.js'
import './AdminServiceRequests.css'

function AdminServiceRequests() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, totalItems: 0 })
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true

    fetchAdminServiceEnquiries({ status, page, limit: 20 })
      .then((data) => {
        if (!active) return
        setItems(Array.isArray(data?.enquiries) ? data.enquiries : [])
        setPagination(data?.pagination || { page, totalPages: 0, totalItems: 0 })
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.response?.data?.message || 'Unable to load service requests.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [status, page, reload])

  const normalizedSearch = search.trim().toLowerCase()
  const filteredItems = normalizedSearch
    ? items.filter((item) => `${item.referenceNumber || ''} ${item.projectTitle || ''} ${item.customerName || ''} ${item.customerEmail || ''}`.toLowerCase().includes(normalizedSearch))
    : items

  const reloadItems = () => {
    setLoading(true)
    setError('')
    setReload((value) => value + 1)
  }

  const changeStatusFilter = (nextStatus) => {
    setLoading(true)
    setError('')
    setPage(1)
    setStatus(nextStatus)
  }

  const changePage = (nextPage) => {
    setLoading(true)
    setError('')
    setPage(nextPage)
  }

  return (
    <main className="admin-page admin-service-requests-list">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">CUSTOM WORK</p>
          <h1>Service Requests</h1>
          <p>Review incoming CAD service enquires, quotations, and project status.</p>
        </div>
      </header>

      <div className="admin-filters admin-cad-filters">
        <label>
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this page" />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => changeStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="clarification_required">Clarification required</option>
            <option value="quoted">Quoted</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      {error && <div className="admin-error" role="alert"><span>{error}</span><button type="button" className="button button-outline" onClick={reloadItems} disabled={loading}>Retry</button></div>}

      {loading ? (
        <p className="admin-state">Loading service requests...</p>
      ) : filteredItems.length === 0 ? (
        <p className="admin-state">No service requests match these filters.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Project</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item._id || item.id}>
                  <td>{item.referenceNumber}</td>
                  <td>
                    <strong>{item.projectTitle}</strong>
                    <small>{item.customerEmail}</small>
                  </td>
                  <td>{item.customerName}<br />{item.customerPhone || 'No phone'}</td>
                  <td>{item.status}</td>
                  <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '-'}</td>
                  <td><Link to={`/admin/service-requests/${item._id || item.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && <div className="admin-pagination"><button type="button" disabled={page <= 1 || loading} onClick={() => changePage(Math.max(1, page - 1))}>Previous</button><span>Page {pagination.page || page} of {pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => changePage(Math.min(pagination.totalPages, page + 1))}>Next</button></div>}
    </main>
  )
}

export default AdminServiceRequests
