import { CreditCard, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchAdminCadOrders } from '../../services/adminCadOrdersService.js'

function AdminCadOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ totalPages: 0, totalItems: 0, page: 1, limit: 12 })

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    fetchAdminCadOrders({ page, limit: 12 })
      .then((result) => {
        if (!active) return
        setOrders(Array.isArray(result?.orders) ? result.orders : [])
        setPagination(result?.pagination || { totalPages: 0, totalItems: 0, page, limit: 12 })
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.response?.data?.message || 'Unable to load CAD orders.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [page])

  if (loading) return <main className="admin-page"><header className="admin-page-header"><div><p className="admin-kicker">PURCHASES</p><h1>CAD Orders</h1></div></header><p className="admin-state">Loading CAD orders...</p></main>

  return (
    <main className="admin-page admin-cad-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">PURCHASES</p>
          <h1>CAD Orders</h1>
          <p>Track Razorpay test-mode CAD transactions and purchase status.</p>
        </div>
      </header>

      <div className="admin-filters admin-cad-filters">
        <label>
          <Search size={16} />
          <input value="" readOnly placeholder="Order review is available in this view" />
        </label>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {orders.length === 0 ? (
        <p className="admin-state">No CAD orders have been placed yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Order ID</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><strong>{order.productTitle || 'CAD Product'}</strong><small>{order.productSlug || '-'}</small></td>
                  <td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: order.currency || 'INR' }).format((order.amountInPaise || 0) / 100)}</td>
                  <td><span className="admin-pill">{order.status}</span></td>
                  <td>{order.providerOrderId || '-'}</td>
                  <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="admin-pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
          <span>Page {pagination.page || page} of {pagination.totalPages}</span>
          <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}>Next</button>
        </div>
      )}
    </main>
  )
}

export default AdminCadOrders
