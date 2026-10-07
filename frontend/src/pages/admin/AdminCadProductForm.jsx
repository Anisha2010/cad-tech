import { ArrowLeft, Save, Trash2, UploadCloud } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createAdminCadProduct, deleteCadSecureFile, fetchAdminCadCategories, fetchAdminCadProductById, updateAdminCadProduct, uploadCadPreviewImage, uploadCadSecureFile } from '../../services/adminCadService.js'
import './AdminCadProductForm.css'

const initialForm = {
  title: '',
  slug: '',
  sku: '',
  categoryId: '',
  shortDescription: '',
  description: '',
  software: '',
  fileFormats: '',
  highlights: '',
  packageContents: '',
  compatibilityNotes: '',
  originalPriceInPaise: '',
  salePriceInPaise: '',
  isFree: false,
  featured: false,
  previewImages: '',
  previewVideoUrl: '',
  licenseType: 'personal_and_commercial',
  status: 'draft'
}

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : null
}

const normalizeList = (value) => String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean)

function AdminCadProductForm() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(Boolean(productId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [secureFile, setSecureFile] = useState(null)
  const [secureFileStatus, setSecureFileStatus] = useState('idle')
  const [secureError, setSecureError] = useState('')
  const [secureSuccess, setSecureSuccess] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [previewImageUploading, setPreviewImageUploading] = useState(false)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await fetchAdminCadCategories()
        setCategories(Array.isArray(result?.categories) ? result.categories : [])
      } catch {
        setCategories([])
      }
    }

    loadCategories()

    if (!productId) {
      setLoading(false)
      return
    }

    fetchAdminCadProductById(productId)
      .then((result) => {
        const product = result?.product || result || {}
        setForm({
          title: product.title || '',
          slug: product.slug || '',
          sku: product.sku || '',
          categoryId: product.categoryId || product.category?.id || '',
          shortDescription: product.shortDescription || '',
          description: product.description || '',
          software: Array.isArray(product.software) ? product.software.join(', ') : '',
          fileFormats: Array.isArray(product.fileFormats) ? product.fileFormats.join(', ') : '',
          highlights: Array.isArray(product.highlights) ? product.highlights.join(', ') : '',
          packageContents: Array.isArray(product.packageContents) ? product.packageContents.join(', ') : '',
          compatibilityNotes: product.compatibilityNotes || '',
          originalPriceInPaise: Number.isInteger(Number(product.originalPriceInPaise)) ? String(Number(product.originalPriceInPaise)) : '',
          salePriceInPaise: Number.isInteger(Number(product.salePriceInPaise)) ? String(Number(product.salePriceInPaise)) : '',
          isFree: Boolean(product.isFree),
          featured: Boolean(product.featured),
          previewImages: Array.isArray(product.previewImages) ? product.previewImages.map((image) => image.url || '').filter(Boolean).join(', ') : '',
          previewVideoUrl: product.previewVideoUrl || '',
          licenseType: product.licenseType || 'personal_and_commercial',
          status: ['draft', 'published', 'archived'].includes(product.status) ? product.status : 'draft'
        })
        setSecureFile(product.secureFile || null)
      })
      .catch(() => setError('Unable to load this CAD product.'))
      .finally(() => setLoading(false))
  }, [productId])

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handlePreviewImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setPreviewImageUploading(true)
    try {
      const result = await uploadCadPreviewImage(file)
      const imageUrl = result?.image?.url
      if (!imageUrl) throw new Error('The upload did not return an image URL.')
      updateField('previewImages', [...normalizeList(form.previewImages), imageUrl].join(', '))
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to upload preview image.')
    } finally {
      setPreviewImageUploading(false)
      event.target.value = ''
    }
  }

  const formatFileSize = (sizeInBytes) => {
    if (!Number.isFinite(Number(sizeInBytes)) || Number(sizeInBytes) <= 0) return 'Unknown size'
    const units = ['B', 'KB', 'MB', 'GB']
    const value = Math.max(Number(sizeInBytes), 0)
    let index = 0
    let current = value
    while (current >= 1024 && index < units.length - 1) {
      current /= 1024
      index += 1
    }
    return `${current.toFixed(current >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
  }

  const handleSecureUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !productId) return
    if (!window.confirm('Upload this secure CAD file and replace any existing file?')) {
      event.target.value = ''
      return
    }

    setSecureFileStatus('uploading')
    setSecureError('')
    setSecureSuccess('')
    setSelectedFileName(file.name)
    setUploading(true)

    try {
      const result = await uploadCadSecureFile(productId, file)
      const nextFile = result?.product?.secureFile || result?.secureFile || null
      setSecureFile(nextFile)
      setSecureFileStatus('uploaded')
      setSecureSuccess('Secure CAD file uploaded successfully.')
      event.target.value = ''
      setSelectedFileName('')
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Unable to upload the secure CAD file.'
      setSecureError(message)
      setSecureFileStatus('error')
    } finally {
      setUploading(false)
    }
  }

  const handleSecureDelete = async () => {
    if (!productId || !secureFile) return
    if (!window.confirm('Delete the secure CAD file and revoke access to the private download?')) return

    setSecureFileStatus('deleting')
    setSecureError('')
    setSecureSuccess('')
    setDeleting(true)

    try {
      const result = await deleteCadSecureFile(productId)
      const currentProduct = result?.product || result || null
      setSecureFile(currentProduct?.secureFile || null)
      setSecureSuccess('Secure CAD file removed successfully.')
      setSecureFileStatus('idle')
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Unable to delete the secure CAD file.'
      setSecureError(message)
      setSecureFileStatus('error')
    } finally {
      setDeleting(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        sku: form.sku.trim() || null,
        categoryId: form.categoryId,
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        software: normalizeList(form.software),
        fileFormats: normalizeList(form.fileFormats).map((item) => item.toUpperCase()),
        highlights: normalizeList(form.highlights),
        packageContents: normalizeList(form.packageContents),
        compatibilityNotes: form.compatibilityNotes.trim() || null,
        originalPriceInPaise: form.isFree ? 0 : toNumber(form.originalPriceInPaise),
        salePriceInPaise: form.isFree ? 0 : toNumber(form.salePriceInPaise),
        isFree: Boolean(form.isFree),
        featured: Boolean(form.featured),
        previewImages: normalizeList(form.previewImages).map((url) => ({ url })),
        previewVideoUrl: form.previewVideoUrl.trim() || null,
        licenseType: form.licenseType,
        status: ['draft', 'published', 'archived'].includes(form.status) ? form.status : 'draft'
      }

      if (!payload.title) throw new Error('Product title is required.')
      if (!payload.categoryId) throw new Error('Please choose a category.')
      if (!payload.shortDescription) throw new Error('Short description is required.')
      if (!payload.description) throw new Error('Full description is required.')
      if (payload.software.length === 0) throw new Error('Add at least one software option.')
      if (payload.fileFormats.length === 0) throw new Error('Add at least one supported file format.')
      if (payload.packageContents.length === 0) throw new Error('Add at least one package content item.')
      if (payload.previewImages.length === 0) throw new Error('At least one preview image URL is required.')
      if (!payload.isFree && (!Number.isInteger(payload.salePriceInPaise) || payload.salePriceInPaise <= 0)) {
        throw new Error('Paid products require a valid positive sale price in paise.')
      }

      if (productId) {
        await updateAdminCadProduct(productId, payload)
      } else {
        await createAdminCadProduct(payload)
      }

      navigate('/admin/cad-products', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to save CAD product.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="admin-page"><p className="admin-state">Loading CAD product...</p></main>

  return (
    <main className="admin-page admin-form-page">
      <Link className="admin-back-link" to="/admin/cad-products"><ArrowLeft size={16} /> CAD Products</Link>
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">{productId ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</p>
          <h1>{productId ? 'Edit CAD Product' : 'Create CAD Product'}</h1>
        </div>
      </header>

      {error && <p className="admin-error" role="alert">{error}</p>}

      <form className="admin-cad-product-form" onSubmit={submit}>
        <div className="admin-form-grid">
          <label>
            Product title
            <input value={form.title} onChange={(event) => updateField('title', event.target.value)} />
          </label>
          <label>
            Slug
            <input value={form.slug} onChange={(event) => updateField('slug', event.target.value)} />
          </label>
          <label>
            SKU
            <input value={form.sku} onChange={(event) => updateField('sku', event.target.value)} />
          </label>
          <label>
            Category
            <select value={form.categoryId} onChange={(event) => updateField('categoryId', event.target.value)}>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>

        <label>
          Short description
          <textarea rows="3" value={form.shortDescription} onChange={(event) => updateField('shortDescription', event.target.value)} />
        </label>

        <label>
          Full description
          <textarea rows="5" value={form.description} onChange={(event) => updateField('description', event.target.value)} />
        </label>

        <div className="admin-form-grid">
          <label>
            Software (comma separated)
            <input value={form.software} onChange={(event) => updateField('software', event.target.value)} />
          </label>
          <label>
            File formats (comma separated)
            <input value={form.fileFormats} onChange={(event) => updateField('fileFormats', event.target.value)} />
          </label>
          <label>
            Highlights (comma separated)
            <input value={form.highlights} onChange={(event) => updateField('highlights', event.target.value)} />
          </label>
          <label>
            Package contents (comma separated)
            <input value={form.packageContents} onChange={(event) => updateField('packageContents', event.target.value)} />
          </label>
        </div>

        <div className="admin-form-grid">
          <label>
            Original price (paise)
            <input type="number" min="0" value={form.originalPriceInPaise} onChange={(event) => updateField('originalPriceInPaise', event.target.value)} />
          </label>
          <label>
            Sale price (paise)
            <input type="number" min="0" value={form.salePriceInPaise} onChange={(event) => updateField('salePriceInPaise', event.target.value)} />
          </label>
          <label>
            License type
            <select value={form.licenseType} onChange={(event) => updateField('licenseType', event.target.value)}>
              <option value="personal">Personal</option>
              <option value="commercial">Commercial</option>
              <option value="personal_and_commercial">Personal & Commercial</option>
            </select>
          </label>
          <label className="admin-check-wrap">
            <input type="checkbox" checked={form.isFree} onChange={(event) => updateField('isFree', event.target.checked)} />
            Free product
          </label>
          <label className="admin-check-wrap">
            <input type="checkbox" checked={form.featured} onChange={(event) => updateField('featured', event.target.checked)} />
            Featured
          </label>
        </div>

        <label>
          Preview image URLs (comma separated)
          <input value={form.previewImages} onChange={(event) => updateField('previewImages', event.target.value)} />
        </label>
        <label>
          Upload preview image
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePreviewImageUpload} disabled={previewImageUploading} />
          {previewImageUploading && <span role="status">Uploading preview image...</span>}
        </label>

        <label>
          Preview video URL
          <input value={form.previewVideoUrl} onChange={(event) => updateField('previewVideoUrl', event.target.value)} />
        </label>

        <label>
          Compatibility notes
          <textarea rows="2" value={form.compatibilityNotes} onChange={(event) => updateField('compatibilityNotes', event.target.value)} />
        </label>

        {!productId ? null : (
          <section className="admin-secure-file-card" aria-live="polite">
            <div className="admin-secure-header">
              <div>
                <p className="admin-kicker">Secure Download File</p>
                <h3>Secure CAD File</h3>
              </div>
              <span className="admin-storage-badge">{secureFile ? 'Storage Ready' : 'Storage Unavailable'}</span>
            </div>

            <div className="admin-secure-details">
              <div>
                <label>Current file</label>
                <strong>{secureFile?.originalName || 'No secure file uploaded'}</strong>
              </div>
              <div>
                <label>Extension</label>
                <strong>{secureFile?.mimeType ? secureFile.mimeType.split('/').pop() : '—'}</strong>
              </div>
              <div>
                <label>Size</label>
                <strong>{secureFile ? formatFileSize(secureFile.sizeInBytes) : '—'}</strong>
              </div>
              <div>
                <label>Uploaded</label>
                <strong>{secureFile?.uploadedAt ? new Date(secureFile.uploadedAt).toLocaleString() : 'Not uploaded yet'}</strong>
              </div>
            </div>

            <div className="admin-secure-upload-row">
              <label className="file-picker">
                <input type="file" accept=".dwg,.dxf,.step,.stp,.iges,.igs,.stl,.obj,.fbx,.sldprt,.sldasm,.pdf,.zip" onChange={handleSecureUpload} disabled={!productId || uploading || deleting || !secureFileStatus || secureFileStatus === 'uploading'} />
                <span className="file-picker-content"><UploadCloud size={16} /> {uploading ? 'Uploading...' : secureFile ? 'Replace Secure File' : 'Upload Secure File'}</span>
              </label>
              {secureFile && (
                <button type="button" className="button button-danger" onClick={handleSecureDelete} disabled={deleting || uploading}>
                  <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete File'}
                </button>
              )}
            </div>

            {selectedFileName && <p className="admin-secure-filename">Selected: {selectedFileName}</p>}
            <p className="admin-secure-hint">Allowed: .dwg, .dxf, .step, .stp, .iges, .igs, .stl, .obj, .fbx, .sldprt, .sldasm, .pdf, .zip. Maximum size: 50 MB.</p>

            {secureError && <p className="admin-error" role="alert">{secureError}</p>}
            {secureSuccess && <p className="admin-success" role="status">{secureSuccess}</p>}
          </section>
        )}

        <div className="admin-form-actions">
          <Link className="button button-outline" to="/admin/cad-products">Cancel</Link>
          <button className="button button-primary" type="submit" disabled={saving}>
            <Save size={17} /> {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </main>
  )
}

export default AdminCadProductForm
