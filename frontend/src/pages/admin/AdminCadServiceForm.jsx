import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { createAdminCadService, fetchAdminCadServiceById, updateAdminCadService } from '../../services/adminCadService.js'
import './AdminCadServiceForm.css'
import './AdminCadServiceForm.css'

const emptyForm = {
  title: '',
  slug: '',
  shortDescription: '',
  description: '',
  category: 'General CAD',
  features: '',
  deliverables: '',
  supportedSoftware: '',
  thumbnail: '',
  startingPrice: '',
  estimatedDeliveryDays: '',
  displayOrder: 0,
  status: 'draft'
}

const toForm = (service) => ({
  ...emptyForm,
  ...service,
  features: Array.isArray(service.features) ? service.features.join('\n') : '',
  deliverables: Array.isArray(service.deliverables) ? service.deliverables.join('\n') : '',
  supportedSoftware: Array.isArray(service.supportedSoftware) ? service.supportedSoftware.join('\n') : '',
  startingPrice: Number.isInteger(service.startingPriceInPaise) ? (service.startingPriceInPaise / 100).toFixed(2) : '',
  estimatedDeliveryDays: service.estimatedDeliveryDays ?? '',
  thumbnail: service.thumbnail || ''
})

const toList = (value) => value.split('\n').map((entry) => entry.trim()).filter(Boolean)
const toSlug = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const errorMessage = (error) => error.response?.data?.message || error.message || 'Unable to save CAD service.'

function AdminCadServiceForm() {
  const { serviceId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(Boolean(serviceId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.notice || '')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!serviceId) return undefined
    let active = true
    fetchAdminCadServiceById(serviceId)
      .then((result) => {
        if (active) setForm(toForm(result?.service || {}))
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load this CAD service.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [serviceId, reload])

  const updateField = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const price = form.startingPrice === '' ? null : Number(form.startingPrice)
      const deliveryDays = form.estimatedDeliveryDays === '' ? null : Number(form.estimatedDeliveryDays)
      if (price !== null && (!Number.isFinite(price) || price < 0 || Math.abs(Math.round(price * 100) - price * 100) > 0.000001)) {
        throw new Error('Enter a non-negative price with no more than two decimal places.')
      }
      if (deliveryDays !== null && (!Number.isInteger(deliveryDays) || deliveryDays < 1)) {
        throw new Error('Estimated delivery must be a whole number of at least one day.')
      }

      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || toSlug(form.title),
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        features: toList(form.features),
        deliverables: toList(form.deliverables),
        supportedSoftware: toList(form.supportedSoftware),
        thumbnail: form.thumbnail.trim() || null,
        startingPriceInPaise: price === null ? null : Math.round(price * 100),
        estimatedDeliveryDays: deliveryDays,
        displayOrder: Number(form.displayOrder || 0),
        status: form.status
      }

      const result = serviceId
        ? await updateAdminCadService(serviceId, payload)
        : await createAdminCadService(payload)

      if (!serviceId && result?.service?.id) {
        navigate(`/admin/cad-services/${result.service.id}/edit`, { replace: true, state: { notice: 'CAD service created successfully.' } })
      } else {
        setForm(toForm(result?.service || payload))
        setSuccess('CAD service saved successfully.')
      }
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="admin-service-form"><p className="admin-state" aria-live="polite">Loading CAD service...</p></main>

  return (
    <main className="admin-service-form admin-page">
      <header className="admin-page-header">
        <div><p className="admin-kicker">SERVICE CATALOG</p><h1>{serviceId ? 'Edit CAD Service' : 'Create CAD Service'}</h1><p>Manage service details, pricing, deliverables, and publication.</p></div>
        <Link className="button button-outline" to="/admin/cad-services">Back to services</Link>
      </header>
      {error && <div className="admin-error" role="alert"><span>{error}</span>{serviceId && <button type="button" className="button button-outline" onClick={() => { setError(''); setLoading(true); setReload((value) => value + 1) }}>Retry</button>}</div>}
      {(success || location.state?.notice) && <p className="admin-service-success" role="status">{success || location.state.notice}</p>}

      <form className="admin-service-form-panel" onSubmit={handleSubmit}>
        <div className="admin-service-form-grid">
          <label>Title *<input required maxLength="180" value={form.title} onChange={(event) => updateField('title', event.target.value)} /></label>
          <label>Slug<input pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => updateField('slug', event.target.value)} placeholder="Generated from title if blank" /></label>
          <label className="is-wide">Short description *<textarea required maxLength="280" rows="2" value={form.shortDescription} onChange={(event) => updateField('shortDescription', event.target.value)} /></label>
          <label className="is-wide">Description *<textarea required rows="5" value={form.description} onChange={(event) => updateField('description', event.target.value)} /></label>
          <label>Category<input maxLength="80" value={form.category} onChange={(event) => updateField('category', event.target.value)} /></label>
          <label>Thumbnail URL<input type="url" value={form.thumbnail} onChange={(event) => updateField('thumbnail', event.target.value)} /></label>
          <label>Starting price (INR)<input type="number" min="0" step="0.01" value={form.startingPrice} onChange={(event) => updateField('startingPrice', event.target.value)} /></label>
          <label>Estimated delivery (days)<input type="number" min="1" step="1" value={form.estimatedDeliveryDays} onChange={(event) => updateField('estimatedDeliveryDays', event.target.value)} /></label>
          <label>Display order<input type="number" min="0" step="1" value={form.displayOrder} onChange={(event) => updateField('displayOrder', event.target.value)} /></label>
          <label>Status<select value={form.status} onChange={(event) => updateField('status', event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
          <label>Features, one per line<textarea rows="4" value={form.features} onChange={(event) => updateField('features', event.target.value)} /></label>
          <label>Deliverables, one per line<textarea rows="4" value={form.deliverables} onChange={(event) => updateField('deliverables', event.target.value)} /></label>
          <label className="is-wide">Supported software, one per line<textarea rows="3" value={form.supportedSoftware} onChange={(event) => updateField('supportedSoftware', event.target.value)} /></label>
        </div>
        <div className="admin-service-form-actions"><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving...' : 'Save service'}</button></div>
      </form>
    </main>
  )
}

export default AdminCadServiceForm