import { useEffect, useState } from 'react'
import { createAdminCmsItem, deleteAdminCmsItem, fetchAdminCmsItems, updateAdminCmsItem } from '../../services/siteContentService.js'
import './AdminWebsiteContent.css'

const contentSections = {
  homepage: {
    label: 'Homepage',
    singular: 'homepage content',
    summaryField: 'heroTitle',
    fields: [
      { name: 'heroTitle', label: 'Hero title', required: true },
      { name: 'heroSubtitle', label: 'Hero subtitle', type: 'textarea' },
      { name: 'heroPrimaryCtaLabel', label: 'Primary CTA label' },
      { name: 'heroPrimaryCtaLink', label: 'Primary CTA link' },
      { name: 'heroSecondaryCtaLabel', label: 'Secondary CTA label' },
      { name: 'heroSecondaryCtaLink', label: 'Secondary CTA link' },
      { name: 'stats', label: 'Stats, one per line', type: 'list' },
      { name: 'featureHighlights', label: 'Feature highlights, one per line', type: 'list' },
      { name: 'displayOrder', label: 'Display order', type: 'number' },
      { name: 'isPublished', label: 'Published', type: 'checkbox' }
    ]
  },
  about: {
    label: 'About',
    singular: 'about content',
    summaryField: 'pageTitle',
    fields: [
      { name: 'pageTitle', label: 'Page title', required: true },
      { name: 'intro', label: 'Introduction', type: 'textarea', required: true },
      { name: 'mission', label: 'Mission', type: 'textarea' },
      { name: 'vision', label: 'Vision', type: 'textarea' },
      { name: 'supportAreas', label: 'Support areas, one per line', type: 'list' },
      { name: 'values', label: 'Values, one per line', type: 'list' },
      { name: 'finalCta', label: 'Final call to action', type: 'textarea' },
      { name: 'displayOrder', label: 'Display order', type: 'number' },
      { name: 'isPublished', label: 'Published', type: 'checkbox' }
    ]
  },
  testimonials: {
    label: 'Testimonials',
    singular: 'testimonial',
    summaryField: 'name',
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'role', label: 'Role' },
      { name: 'company', label: 'Company' },
      { name: 'quote', label: 'Quote', type: 'textarea', required: true },
      { name: 'initials', label: 'Initials' },
      { name: 'displayOrder', label: 'Display order', type: 'number' },
      { name: 'isPublished', label: 'Published', type: 'checkbox' }
    ]
  },
  faqs: {
    label: 'FAQs',
    singular: 'FAQ',
    summaryField: 'question',
    fields: [
      { name: 'question', label: 'Question', required: true },
      { name: 'answer', label: 'Answer', type: 'textarea', required: true },
      { name: 'category', label: 'Category' },
      { name: 'displayOrder', label: 'Display order', type: 'number' },
      { name: 'isPublished', label: 'Published', type: 'checkbox' }
    ]
  },
  portfolio: {
    label: 'Portfolio',
    singular: 'portfolio project',
    summaryField: 'title',
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'slug', label: 'Slug (generated from title when blank)', pattern: '[a-z0-9]+(?:-[a-z0-9]+)*' },
      { name: 'category', label: 'Category' },
      { name: 'summary', label: 'Summary', type: 'textarea' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'imageUrl', label: 'Image URL', type: 'url' },
      { name: 'projectUrl', label: 'Project URL', type: 'url' },
      { name: 'technologies', label: 'Technologies, one per line', type: 'list' },
      { name: 'displayOrder', label: 'Display order', type: 'number' },
      { name: 'isPublished', label: 'Published', type: 'checkbox' }
    ]
  }
}

const createEmptyForm = (section) => Object.fromEntries(contentSections[section].fields.map((field) => [
  field.name,
  field.type === 'checkbox' ? true : field.type === 'number' ? 0 : field.type === 'list' ? '' : ''
]))

const toFormValues = (section, item) => Object.fromEntries(contentSections[section].fields.map((field) => {
  const value = item[field.name]
  return [field.name, field.type === 'list' ? (Array.isArray(value) ? value.join('\n') : '') : value ?? (field.type === 'checkbox' ? true : '')]
}))

const toPayload = (section, form) => Object.fromEntries(contentSections[section].fields.map((field) => {
  const value = form[field.name]
  if (field.type === 'list') return [field.name, value.split('\n').map((entry) => entry.trim()).filter(Boolean)]
  if (field.type === 'number') return [field.name, Number(value)]
  if (field.type === 'checkbox') return [field.name, Boolean(value)]
  return [field.name, value.trim()]
}))

const getErrorMessage = (error, fallback) => error.response?.data?.message || error.message || fallback

function AdminWebsiteContent() {
  const [section, setSection] = useState('homepage')
  const [items, setItems] = useState([])
  const [form, setForm] = useState(() => createEmptyForm('homepage'))
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    fetchAdminCmsItems(section)
      .then((result) => {
        if (active) setItems(Array.isArray(result?.items) ? result.items : [])
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError, `Unable to load ${contentSections[section].label.toLowerCase()} content.`))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [section, reload])

  const changeSection = (nextSection) => {
    if (nextSection === section) return
    setLoading(true)
    setError('')
    setNotice('')
    setItems([])
    setSelectedId('')
    setForm(createEmptyForm(nextSection))
    setSection(nextSection)
  }

  const retryLoad = () => {
    setLoading(true)
    setError('')
    setReload((value) => value + 1)
  }

  const startNewItem = () => {
    setSelectedId('')
    setForm(createEmptyForm(section))
    setError('')
    setNotice('')
  }

  const selectItem = (item) => {
    setSelectedId(String(item._id || item.id || ''))
    setForm(toFormValues(section, item))
    setError('')
    setNotice('')
  }

  const reloadItems = async () => {
    const result = await fetchAdminCmsItems(section)
    setItems(Array.isArray(result?.items) ? result.items : [])
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = toPayload(section, form)
      if (selectedId) await updateAdminCmsItem(section, selectedId, payload)
      else await createAdminCmsItem(section, payload)
      await reloadItems()
      setSelectedId('')
      setForm(createEmptyForm(section))
      setNotice(`${contentSections[section].singular} ${selectedId ? 'updated' : 'created'} successfully.`)
    } catch (requestError) {
      setError(getErrorMessage(requestError, `Unable to save ${contentSections[section].singular}.`))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    const itemId = String(item._id || item.id || '')
    if (!itemId || !window.confirm(`Delete this ${contentSections[section].singular}?`)) return
    setDeletingId(itemId)
    setError('')
    setNotice('')

    try {
      await deleteAdminCmsItem(section, itemId)
      await reloadItems()
      if (selectedId === itemId) {
        setSelectedId('')
        setForm(createEmptyForm(section))
      }
      setNotice(`${contentSections[section].singular} deleted successfully.`)
    } catch (requestError) {
      setError(getErrorMessage(requestError, `Unable to delete ${contentSections[section].singular}.`))
    } finally {
      setDeletingId('')
    }
  }

  const config = contentSections[section]

  return (
    <main className="admin-page admin-website-content">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">PUBLIC SITE</p>
          <h1>Website Content</h1>
          <p>Edit the existing homepage, about, testimonial, FAQ, and portfolio records.</p>
        </div>
      </header>

      <nav className="website-content-tabs" aria-label="Website content sections">
        {Object.entries(contentSections).map(([key, value]) => (
          <button key={key} type="button" className={section === key ? 'is-active' : ''} aria-pressed={section === key} onClick={() => changeSection(key)}>
            {value.label}
          </button>
        ))}
      </nav>

      {error && <div className="admin-error" role="alert"><span>{error}</span><button type="button" className="button button-outline" onClick={retryLoad} disabled={loading}>Retry</button></div>}
      {notice && <p className="website-content-notice" role="status">{notice}</p>}

      <div className="website-content-layout">
        <section className="website-content-list" aria-labelledby="website-content-list-title">
          <div className="website-content-section-heading">
            <div><h2 id="website-content-list-title">{config.label}</h2><span>{items.length} records</span></div>
            <button type="button" className="button button-primary" onClick={startNewItem} disabled={loading || saving}>Add</button>
          </div>
          {loading ? <p className="admin-state" aria-live="polite">Loading {config.label.toLowerCase()}...</p> : items.length === 0 ? (
            <p className="admin-empty">No {config.label.toLowerCase()} records yet.</p>
          ) : (
            <ul className="website-content-records">
              {items.map((item) => {
                const itemId = String(item._id || item.id || '')
                return (
                  <li key={itemId} className={selectedId === itemId ? 'is-selected' : ''}>
                    <button type="button" className="website-content-record" onClick={() => selectItem(item)}>
                      <strong>{item[config.summaryField] || `Untitled ${config.singular}`}</strong>
                      <span>{item.isPublished === false ? 'Draft' : 'Published'}</span>
                    </button>
                    <button type="button" className="website-content-delete" onClick={() => handleDelete(item)} disabled={deletingId === itemId || saving} aria-label={`Delete ${item[config.summaryField] || config.singular}`}>
                      {deletingId === itemId ? 'Deleting...' : 'Delete'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="website-content-editor" aria-labelledby="website-content-form-title">
          <h2 id="website-content-form-title">{selectedId ? `Edit ${config.singular}` : `Add ${config.singular}`}</h2>
          <form onSubmit={handleSubmit}>
            <div className="website-content-fields">
              {config.fields.map((field) => (
                field.type === 'checkbox' ? (
                  <label className="website-content-checkbox" key={field.name}>
                    <input type="checkbox" checked={Boolean(form[field.name])} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.checked }))} />
                    <span>{field.label}</span>
                  </label>
                ) : (
                  <label className={field.type === 'textarea' || field.type === 'list' ? 'is-wide' : ''} key={field.name}>
                    <span>{field.label}{field.required ? ' *' : ''}</span>
                    {field.type === 'textarea' || field.type === 'list' ? (
                      <textarea rows={field.type === 'list' ? 4 : 3} value={form[field.name]} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} required={field.required} />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
                        value={form[field.name]}
                        onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                        required={field.required}
                        pattern={field.pattern}
                        min={field.type === 'number' ? 0 : undefined}
                        step={field.type === 'number' ? 1 : undefined}
                      />
                    )}
                  </label>
                )
              ))}
            </div>
            <div className="website-content-actions">
              <button type="submit" className="button button-primary" disabled={saving || loading}>{saving ? 'Saving...' : selectedId ? 'Save changes' : 'Create record'}</button>
              {selectedId && <button type="button" className="button button-outline" onClick={startNewItem} disabled={saving}>Cancel edit</button>}
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

export default AdminWebsiteContent