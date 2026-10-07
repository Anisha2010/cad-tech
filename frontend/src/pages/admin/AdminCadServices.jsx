import { Archive, CheckCircle2, Eye, Pencil, Plus, Search, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fetchAdminCadServices, updateAdminCadServiceStatus } from '../../services/adminCadService.js'

function AdminCadServices() {
  const location = useLocation()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [reload, setReload] = useState(0)
  const [notice, setNotice] = useState(location.state?.notice || '')

  useEffect(() => {
    let active = true

    fetchAdminCadServices({ search, status, page: 1, limit: 50 })
      .then((data) => {
        if (!active) return
        setServices(Array.isArray(data?.services) ? data.services : [])
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.response?.data?.message || 'Unable to load CAD services.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [search, status, reload])

  const refreshServices = () => {
    setLoading(true)
    setError('')
    setReload((value) => value + 1)
  }

  const updateSearch = (value) => {
    setLoading(true)
    setError('')
    setSearch(value)
  }

  const updateStatusFilter = (value) => {
    setLoading(true)
    setError('')
    setStatus(value)
  }

  const handleStatusToggle = async (service) => {
    const nextStatus = service.status === 'published' ? 'draft' : 'published'
    if (!window.confirm(nextStatus === 'published' ? `Publish ${service.title}?` : `Move ${service.title} back to draft?`)) return

    try {
      await updateAdminCadServiceStatus(service.id, nextStatus)
      setError('')
      setNotice(`Service ${nextStatus === 'published' ? 'published' : 'moved to draft'} successfully.`)
      refreshServices()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update service status.')
    }
  }

  const handleArchive = async (service) => {
    if (!window.confirm(`Archive ${service.title}? It will no longer appear in the public service catalog.`)) return
    try {
      await updateAdminCadServiceStatus(service.id, 'archived')
      setError('')
      setNotice('Service archived successfully.')
      refreshServices()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to archive service.')
    }
  }

  return (
    <main className="admin-page admin-cad-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">SERVICE CATALOG</p>
          <h1>CAD Services</h1>
          <p>Manage custom CAD offers, status, and public visibility.</p>
        </div>
        <div className="admin-service-list-actions">
          <button type="button" className="button button-outline" onClick={refreshServices} disabled={loading}>Refresh</button>
          <Link to="/admin/cad-services/new" className="button button-primary"><Plus size={17} /> Add Service</Link>
        </div>
      </header>

      <div className="admin-filters admin-cad-filters">
        <label>
          <Search size={16} />
          <input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Search service title or slug" />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => updateStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}
      {notice && <p className="admin-service-success" role="status">{notice}</p>}

      {loading ? <p className="admin-state">Loading services...</p> : (
        services.length === 0 ? <p className="admin-state">No service records found.</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Category</th>
                  <th>Starting Price</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <strong>{service.title}</strong>
                      <small>{service.slug}</small>
                    </td>
                    <td>{service.category || 'General CAD'}</td>
                    <td>{service.startingPriceInPaise ? `₹${(service.startingPriceInPaise / 100).toFixed(2)}` : 'Custom quote'}</td>
                    <td>{service.status}</td>
                    <td>{service.updatedAt ? new Date(service.updatedAt).toLocaleDateString() : '-'}</td>
                    <td className="admin-actions admin-cad-actions">
                      <Link to={`/cad-services/${service.slug}`} aria-label={`Preview ${service.title}`}><Eye size={16} /></Link>
                      <Link to={`/admin/cad-services/${service.id}/edit`} aria-label={`Edit ${service.title}`}><Pencil size={16} /></Link>
                      <button type="button" onClick={() => handleStatusToggle(service)} aria-label={service.status === 'published' ? `Move ${service.title} to draft` : `Publish ${service.title}`}>
                        {service.status === 'published' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                      </button>
                      {service.status !== 'archived' && <button type="button" onClick={() => handleArchive(service)} aria-label={`Archive ${service.title}`}>
                        <Archive size={16} />
                      </button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </main>
  )
}

export default AdminCadServices
