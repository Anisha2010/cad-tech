import { Archive, CheckCircle2, Edit3, Eye, Plus, Search, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { archiveAdminCadProduct, fetchAdminCadCategories, fetchAdminCadProducts, publishAdminCadProduct, unpublishAdminCadProduct } from '../../services/adminCadService.js'
import './AdminCadProducts.css'

function AdminCadProducts() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reload, setReload] = useState(0)

  const loadCategories = async () => {
    try {
      const result = await fetchAdminCadCategories()
      setCategories(Array.isArray(result?.categories) ? result.categories : [])
    } catch {
      setCategories([])
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    fetchAdminCadProducts({ search, status, category, page: 1, limit: 50 })
      .then((result) => {
        if (!active) return
        setProducts(Array.isArray(result?.products) ? result.products : [])
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.response?.data?.message || 'Unable to load CAD products.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [search, status, category, reload])

  const handlePublishToggle = async (product) => {
    if (product.status === 'archived') {
      setError('Archived products must be restored through the product editor.')
      return
    }

    if (!window.confirm(product.status === 'published' ? `Move ${product.title} back to draft?` : `Publish ${product.title}?`)) return

    try {
      if (product.status === 'published') await unpublishAdminCadProduct(product.id)
      else await publishAdminCadProduct(product.id)
      setError('')
      setSuccess(`Product ${product.status === 'published' ? 'moved to draft' : 'published'} successfully.`)
      setReload((value) => value + 1)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update product status.')
    }
  }

  const handleArchive = async (product) => {
    if (!window.confirm(`Archive ${product.title}?`)) return

    try {
      await archiveAdminCadProduct(product.id)
      setError('')
      setSuccess('Product archived successfully.')
      setReload((value) => value + 1)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to archive this product.')
    }
  }

  return (
    <main className="admin-page admin-cad-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">CATALOG</p>
          <h1>CAD Products</h1>
          <p>Review availability, publication state, and product metadata for the public marketplace.</p>
        </div>
        <Link className="button button-primary" to="/admin/cad-products/new">
          <Plus size={17} /> Add Product
        </Link>
      </header>

      <div className="admin-filters admin-cad-filters">
        <label>
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, slug, or SKU" />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}
      {success && <p className="admin-success" role="status">{success}</p>}

      {loading ? (
        <p className="admin-state">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="admin-state">No CAD products match these filters.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.title}</strong>
                    <small>{product.slug}</small>
                  </td>
                  <td>{product.category?.name || 'Unassigned'}</td>
                  <td>{product.isFree ? 'Free' : `₹${((product.salePriceInPaise || 0) / 100).toFixed(2)}`}</td>
                  <td>{product.status}</td>
                  <td>{product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : '-'}</td>
                  <td className="admin-actions admin-cad-actions">
                    <Link to={`/admin/cad-products/${product.id}/edit`} aria-label={`Edit ${product.title}`}><Edit3 size={16} /></Link>
                    <button type="button" onClick={() => handlePublishToggle(product)} aria-label={product.status === 'published' ? `Move ${product.title} to draft` : `Publish ${product.title}`}>
                      {product.status === 'published' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                    </button>
                    {product.status !== 'archived' && (
                      <button type="button" onClick={() => handleArchive(product)} aria-label={`Archive ${product.title}`}>
                        <Archive size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

export default AdminCadProducts
