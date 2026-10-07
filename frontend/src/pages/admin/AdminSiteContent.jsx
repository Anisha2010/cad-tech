import { useEffect, useState } from 'react'
import { fetchAdminCmsSummary, fetchAdminSiteSettings, saveAdminSiteSettings, uploadFounderImage } from '../../services/siteContentService.js'
import './AdminSiteContent.css'

const defaultForm = {
  businessName: 'CadTech Solution',
  brandName: 'CadTech Solution',
  tagline: 'Professional CAD models, engineering services, and practical training.',
  contactEmail: 'arvind@cadtechsolution.com',
  contactPhone: '+91 88399 89046',
  contactAddress: 'Bengaluru, India',
  primaryCtaLabel: 'Explore Courses',
  primaryCtaLink: '/courses',
  secondaryCtaLabel: 'Request a Quote',
  secondaryCtaLink: '/contact',
  metaTitle: 'CadTech Solution | CAD Training and Design Services',
  metaDescription: 'Learn CAD, access engineering resources, and request professional design support.',
  heroImageUrl: '',
  founderImageUrl: '',
  socialLinks: {
    facebook: '',
    linkedin: '',
    instagram: '',
    youtube: ''
  }
}

function AdminSiteContent() {
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingFounderImage, setUploadingFounderImage] = useState(false)
  const [reload, setReload] = useState(0)
  const [success, setSuccess] = useState('')
  const [summary, setSummary] = useState({ homepageCount: 0, aboutCount: 0, testimonialsCount: 0, faqCount: 0, portfolioCount: 0, newContactEnquiries: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      fetchAdminSiteSettings(),
      fetchAdminCmsSummary()
    ]).then(([siteRes, summaryRes]) => {
      if (!active) return
      const settings = siteRes?.settings || defaultForm
      setForm({
        ...defaultForm,
        ...settings,
        socialLinks: { ...defaultForm.socialLinks, ...(settings.socialLinks || {}) }
      })
      setSummary(summaryRes || {})
    }).catch((requestError) => {
      if (!active) return
      setError(requestError.response?.data?.message || 'Unable to load site settings.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [reload])

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const updateSocialField = (field, value) => setForm((current) => ({
    ...current,
    socialLinks: { ...current.socialLinks, [field]: value }
  }))

  const handleFounderImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const nextError = validateFounderImageFile(file)
    if (nextError) {
      setError(nextError)
      setSuccess('')
      event.target.value = ''
      return
    }

    setUploadingFounderImage(true)
    setError('')
    setSuccess('')

    try {
      const response = await uploadFounderImage(file)
      const founderImageUrl = response?.image?.url || response?.settings?.founderImageUrl
      if (!founderImageUrl) throw new Error('The upload did not return a founder image URL.')
      setForm((current) => ({ ...current, founderImageUrl }))
      setSuccess('Founder image uploaded successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to upload founder image.')
    } finally {
      setUploadingFounderImage(false)
      event.target.value = ''
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextError = validateSettings(form)
    if (nextError) {
      setError(nextError)
      setSuccess('')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await saveAdminSiteSettings(form)
      setSuccess('Site settings saved successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save site settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="admin-page admin-site-settings"><p className="admin-state">Loading settings...</p></main>

  return (
    <main className="admin-page admin-form-page admin-site-settings">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">PUBLIC WEBSITE</p>
          <h1>Site Settings</h1>
          <p>Manage public business information, branding, calls to action, search metadata, and social links.</p>
        </div>
      </header>

      <div className="site-settings-content">
        {error && <div className="admin-error" role="alert"><span>{error}</span><button type="button" className="button button-outline" onClick={() => { setLoading(true); setReload((value) => value + 1) }} disabled={loading}>Retry</button></div>}
        {success && <p className="admin-success" role="status">{success}</p>}

        <section className="site-settings-summary" aria-label="Public website content counts">
          <header><div><h2>Public Content</h2><p>Current CMS records displayed on the public website.</p></div></header>
          <div className="site-settings-summary-grid">
            <Summary label="Homepage" value={summary.homepageCount} />
            <Summary label="About" value={summary.aboutCount} />
            <Summary label="Testimonials" value={summary.testimonialsCount} />
            <Summary label="FAQs" value={summary.faqCount} />
            <Summary label="Portfolio" value={summary.portfolioCount} />
            <Summary label="New enquiries" value={summary.newContactEnquiries} />
          </div>
        </section>

        <form className="site-settings-form" onSubmit={handleSubmit}>
          <SettingsSection title="Business & Branding" description="Identity and contact details shown across the public site.">
            <SiteField label="Business name" required><input required value={form.businessName} onChange={(event) => updateField('businessName', event.target.value)} /></SiteField>
            <SiteField label="Brand name" required><input required value={form.brandName} onChange={(event) => updateField('brandName', event.target.value)} /></SiteField>
            <SiteField label="Tagline" wide><textarea rows="3" value={form.tagline} onChange={(event) => updateField('tagline', event.target.value)} /></SiteField>
            <SiteField label="Contact email" required><input type="email" required value={form.contactEmail} onChange={(event) => updateField('contactEmail', event.target.value)} /></SiteField>
            <SiteField label="Contact phone"><input type="tel" value={form.contactPhone} onChange={(event) => updateField('contactPhone', event.target.value)} /></SiteField>
            <SiteField label="Contact address"><textarea rows="2" value={form.contactAddress} onChange={(event) => updateField('contactAddress', event.target.value)} /></SiteField>
            <SiteField label="Hero image URL" helper="Optional. Use a public HTTPS image URL."><input type="url" value={form.heroImageUrl} onChange={(event) => updateField('heroImageUrl', event.target.value)} /></SiteField>
            <SiteField label="Founder image" helper="Upload a JPG, PNG, or WebP image up to 10 MB."><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFounderImageUpload} disabled={uploadingFounderImage} />{uploadingFounderImage && <small role="status">Uploading founder image...</small>}{form.founderImageUrl && <img className="site-settings-founder-preview" src={form.founderImageUrl} alt="Founder preview" onError={(event) => { event.currentTarget.hidden = true }} />}</SiteField>
            <SiteField label="Founder image URL" helper="Optional. Use a public HTTPS image URL."><input type="url" value={form.founderImageUrl} onChange={(event) => updateField('founderImageUrl', event.target.value)} /></SiteField>
          </SettingsSection>

          <SettingsSection title="Homepage Calls to Action" description="Control the primary links presented to site visitors.">
            <SiteField label="Primary CTA label" required><input required value={form.primaryCtaLabel} onChange={(event) => updateField('primaryCtaLabel', event.target.value)} /></SiteField>
            <SiteField label="Primary CTA link" required helper="Use a site path such as /courses or an HTTPS URL."><input required value={form.primaryCtaLink} onChange={(event) => updateField('primaryCtaLink', event.target.value)} /></SiteField>
            <SiteField label="Secondary CTA label" required><input required value={form.secondaryCtaLabel} onChange={(event) => updateField('secondaryCtaLabel', event.target.value)} /></SiteField>
            <SiteField label="Secondary CTA link" required helper="Use a site path such as /contact or an HTTPS URL."><input required value={form.secondaryCtaLink} onChange={(event) => updateField('secondaryCtaLink', event.target.value)} /></SiteField>
          </SettingsSection>

          <SettingsSection title="Search & SEO" description="Metadata used by search engines and browser previews.">
            <SiteField label="Meta title" required wide><input required maxLength="160" value={form.metaTitle} onChange={(event) => updateField('metaTitle', event.target.value)} /></SiteField>
            <SiteField label="Meta description" required wide><textarea required rows="4" maxLength="320" value={form.metaDescription} onChange={(event) => updateField('metaDescription', event.target.value)} /></SiteField>
          </SettingsSection>

          <SettingsSection title="Social Links" description="Optional public profiles linked from the website.">
            <SiteField label="Facebook"><input type="url" value={form.socialLinks.facebook} onChange={(event) => updateSocialField('facebook', event.target.value)} /></SiteField>
            <SiteField label="LinkedIn"><input type="url" value={form.socialLinks.linkedin} onChange={(event) => updateSocialField('linkedin', event.target.value)} /></SiteField>
            <SiteField label="Instagram"><input type="url" value={form.socialLinks.instagram} onChange={(event) => updateSocialField('instagram', event.target.value)} /></SiteField>
            <SiteField label="YouTube"><input type="url" value={form.socialLinks.youtube} onChange={(event) => updateSocialField('youtube', event.target.value)} /></SiteField>
          </SettingsSection>

          <div className="site-settings-submit"><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Site Settings'}</button></div>
        </form>
      </div>
    </main>
  )
}

function validateSettings(form) {
  if (!form.businessName.trim() || !form.brandName.trim() || !form.primaryCtaLabel.trim() || !form.secondaryCtaLabel.trim() || !form.metaTitle.trim() || !form.metaDescription.trim()) return 'Complete all required site settings before saving.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) return 'Enter a valid public contact email.'
  const validLink = (value) => {
    const link = value.trim()
    if (link.startsWith('/') && !link.startsWith('//')) return true
    try { return new URL(link).protocol === 'https:' || new URL(link).protocol === 'http:' } catch { return false }
  }
  if (!validLink(form.primaryCtaLink) || !validLink(form.secondaryCtaLink)) return 'CTA links must be valid site paths or HTTP(S) URLs.'
  const urls = [form.heroImageUrl, form.founderImageUrl, ...Object.values(form.socialLinks)].filter(Boolean)
  if (urls.some((value) => { try { return !['http:', 'https:'].includes(new URL(value).protocol) } catch { return true } })) return 'Image and social links must be valid HTTP(S) URLs.'
  return ''
}

function validateFounderImageFile(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Choose a JPG, PNG, or WebP image.'
  if (file.size > 10 * 1024 * 1024) return 'Founder images must be 10 MB or smaller.'
  return ''
}

function SettingsSection({ title, description, children }) {
  return <section className="site-settings-section"><header><h2>{title}</h2><p>{description}</p></header><div className="site-settings-grid">{children}</div></section>
}

function SiteField({ label, required = false, wide = false, helper, children }) {
  return <label className={`site-settings-field${wide ? ' is-wide' : ''}`}><span>{label}{required ? ' *' : ''}</span>{children}{helper && <small>{helper}</small>}</label>
}

function Summary({ label, value = 0 }) {
  return <div className="site-settings-summary-item"><strong>{Number(value) || 0}</strong><span>{label}</span></div>
}

export default AdminSiteContent
