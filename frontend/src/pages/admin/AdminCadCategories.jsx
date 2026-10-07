import { Plus, PencilLine, Trash2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createAdminCadCategory, deleteAdminCadCategory, fetchAdminCadCategories, updateAdminCadCategory } from '../../services/adminCadService.js'
import './AdminCadCategories.css'

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  icon: '',
  sortOrder: 0,
  isActive: true
}

function AdminCadCategories() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadCategories = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchAdminCadCategories()
      setCategories(Array.isArray(result?.categories) ? result.categories : [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load CAD categories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim() || null,
        icon: form.icon.trim() || null,
        sortOrder: Number(form.sortOrder || 0),
        isActive: Boolean(form.isActive)
      }

      if (!payload.name) throw new Error('Category name is required.')
      if (!payload.slug) throw new Error('Category slug is required.')

      if (editingId) {
        await updateAdminCadCategory(editingId, payload)
      } else {
        await createAdminCadCategory(payload)
      }
      setSuccess(`Category ${editingId ? 'updated' : 'created'} successfully.`)

      setForm(emptyForm)
      setEditingId(null)
      await loadCategories()
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to save CAD category.')
    } finally {
      setSaving(false)
    }
  }

  const startEditing = (category) => {
    setEditingId(category.id)
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      icon: category.icon || '',
      sortOrder: Number(category.sortOrder || 0),
      isActive: Boolean(category.isActive)
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  const removeCategory = async (category) => {
    if (!window.confirm(`Deactivate ${category.name}? This removes the category from active listings.`)) return

    try {
      setError('')
      setSuccess('')
      await deleteAdminCadCategory(category.id)
      await loadCategories()
      if (editingId === category.id) cancelEditing()
      setSuccess('Category deactivated successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to deactivate this category.')
    }
  }

  return (
    <main className="admin-page admin-cad-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">MARKETPLACE</p>
          <h1>CAD Categories</h1>
          <p>Manage active category groupings for public marketplace listings.</p>
        </div>
        <Link className="button button-primary" to="/admin/cad-products">
          <Plus size={17} /> View Products
        </Link>
      </header>

      <div className="admin-cad-panel">
        <h2>{editingId ? 'Edit Category' : 'Create Category'}</h2>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {success && <p className="admin-success" role="status">{success}</p>}
        <form className="admin-cad-form" onSubmit={submit}>
          <label>
            Category name
            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Mechanical Design" />
          </label>
          <label>
            Slug
            <input value={form.slug} onChange={(event) => updateField('slug', event.target.value)} placeholder="mechanical-design" />
          </label>
          <label>
            Description
            <textarea rows="3" value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Describe what this category covers" />
          </label>
          <div className="admin-cad-grid">
            <label>
              Image URL
              <input value={form.imageUrl} onChange={(event) => updateField('imageUrl', event.target.value)} placeholder="https://..." />
            </label>
            <label>
              Icon name
              <input value={form.icon} onChange={(event) => updateField('icon', event.target.value)} placeholder="drafting" />
            </label>
            <label>
              Sort order
              <input type="number" min="0" value={form.sortOrder} onChange={(event) => updateField('sortOrder', event.target.value)} />
            </label>
            <label className="admin-check-wrap">
              <input type="checkbox" checked={form.isActive} onChange={(event) => updateField('isActive', event.target.checked)} />
              Active category
            </label>
          </div>
          <div className="admin-form-actions">
            {editingId && <button type="button" className="button button-outline" onClick={cancelEditing}><XCircle size={16} /> Cancel</button>}
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-cad-panel">
        <h2>Category Directory</h2>
        {loading ? (
          <p className="admin-state">Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="admin-state">No CAD categories exist yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <strong>{category.name}</strong>
                      {category.description && <small>{category.description}</small>}
                    </td>
                    <td>{category.slug}</td>
                    <td>{category.sortOrder}</td>
                    <td>{category.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="admin-actions">
                      <button type="button" onClick={() => startEditing(category)} aria-label={`Edit ${category.name}`}><PencilLine size={16} /></button>
                      <button type="button" onClick={() => removeCategory(category)} aria-label={`Deactivate ${category.name}`}><Trash2 size={16} /></button>
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

export default AdminCadCategories
