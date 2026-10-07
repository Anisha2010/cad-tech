import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCadServiceBySlug, createServiceEnquiry } from '../../services/cadService.js'

function CADServiceDetail() {
  const { slug } = useParams()
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    projectTitle: '',
    projectDescription: '',
    preferredSoftware: '',
    customerPhone: '',
    expectedDeliveryDate: '',
    budgetInPaise: '',
    requiredFileFormats: ''
  })

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    getCadServiceBySlug(slug)
      .then((data) => {
        if (!active) return
        setService(data)
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.response?.data?.message || 'Unable to load this CAD service.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [slug])

  useEffect(() => {
    const previousTitle = document.title
    document.title = service ? `${service.title} | CadTech Solution` : 'CAD Service | CadTech Solution'
    return () => { document.title = previousTitle }
  }, [service])

  const requiredFormats = useMemo(() => form.requiredFileFormats.split(',').map((entry) => entry.trim()).filter(Boolean), [form.requiredFileFormats])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await createServiceEnquiry({
        serviceId: service.id,
        projectTitle: form.projectTitle,
        projectDescription: form.projectDescription,
        preferredSoftware: form.preferredSoftware,
        customerPhone: form.customerPhone,
        expectedDeliveryDate: form.expectedDeliveryDate || null,
        budgetInPaise: form.budgetInPaise ? Number(form.budgetInPaise) : null,
        requiredFileFormats: requiredFormats
      })

      window.location.href = '/student/service-requests'
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit your service request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <main className="service-details page-placeholder"><h1>Loading service...</h1></main>
  if (!service) return <main className="service-details page-placeholder"><h1>Service not found</h1><Link className="button button-primary" to="/cad-services">Back to CAD Services</Link></main>

  return (
    <main className="service-details">
      <div className="site-container">
        <nav className="service-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/cad-services">CAD Services</Link>
          <span>/</span>
          <span aria-current="page">{service.title}</span>
        </nav>

        <section className="service-detail-hero">
          <div className="service-detail-icon"><CheckCircle2 size={38} /></div>
          <span className="categories-eyebrow">CUSTOM CAD SERVICE</span>
          <h1>{service.title}</h1>
          <p>{service.shortDescription}</p>
          <div className="service-detail-actions">
            <a className="button button-primary" href="#request-form">Request a Quote <ArrowRight size={17} /></a>
            <Link className="button button-outline" to="/cad-services"><ArrowLeft size={17} /> Back to Services</Link>
          </div>
        </section>

        <section className="service-detail-section">
          <div className="service-detail-section-heading">
            <span className="categories-eyebrow">DELIVERABLES</span>
            <h2 className="section-heading">What this package includes</h2>
          </div>
          <ul className="service-feature-list">
            {(service.features || []).map((feature) => <li key={feature}>{feature}</li>)}
          </ul>
        </section>

        {service.deliverables?.length > 0 && (
          <section className="service-detail-section">
            <div className="service-detail-section-heading">
              <span className="categories-eyebrow">OUTPUT</span>
              <h2 className="section-heading">Typical deliverables</h2>
            </div>
            <ul className="service-feature-list">
              {service.deliverables.map((deliverable) => <li key={deliverable}>{deliverable}</li>)}
            </ul>
          </section>
        )}

        <section className="service-detail-cta" id="request-form">
          <h2>Request a tailored quote</h2>
          <p>Share your project scope, required CAD software, and file expectations to receive a proposal from the CadTech team.</p>

          <form className="contact-form" onSubmit={handleSubmit}>
            {error && <p className="admin-error" role="alert">{error}</p>}
            <div className="contact-grid">
              <label>
                Project title
                <input name="projectTitle" value={form.projectTitle} onChange={handleChange} required minLength={8} />
              </label>
              <label>
                Preferred software
                <input name="preferredSoftware" value={form.preferredSoftware} onChange={handleChange} placeholder="AutoCAD, SolidWorks, Revit" />
              </label>
              <label>
                Phone number
                <input name="customerPhone" value={form.customerPhone} onChange={handleChange} placeholder="+91 88399 89046" />
              </label>
              <label>
                Expected delivery date
                <input type="date" name="expectedDeliveryDate" value={form.expectedDeliveryDate} onChange={handleChange} />
              </label>
              <label>
                Budget (₹)
                <input type="number" min="0" step="100" name="budgetInPaise" value={form.budgetInPaise} onChange={handleChange} placeholder="250000" />
              </label>
              <label>
                Required file formats
                <input name="requiredFileFormats" value={form.requiredFileFormats} onChange={handleChange} placeholder="DWG, STEP, PDF" />
              </label>
            </div>

            <label>
              Project description
              <textarea name="projectDescription" value={form.projectDescription} onChange={handleChange} rows={6} required minLength={20} />
            </label>

            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Service Request'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

export default CADServiceDetail
