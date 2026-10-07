import { ArrowRight, Briefcase, Search, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCadServiceCatalog } from '../../services/cadService.js'

function CADServiceCatalog() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    getCadServiceCatalog({ search, page: 1, limit: 20 })
      .then((data) => {
        if (!active) return
        setServices(Array.isArray(data?.services) ? data.services : [])
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.response?.data?.message || 'Unable to load CAD service catalog.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [search])

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'CAD Services | CadTech Solution'
    return () => { document.title = previousTitle }
  }, [])

  return (
    <main className="services-page">
      <section className="services-hero">
        <div className="site-container services-hero-grid">
          <div className="services-hero-copy">
            <span className="categories-eyebrow">CUSTOM CAD SOLUTIONS</span>
            <h1>Engineering services tailored to your project scope.</h1>
            <p>From concept development to final production drawing support, CadTech helps teams move from design brief to deliverable.</p>
            <div className="services-actions">
              <a className="button button-primary" href="#service-list">Explore Services <ArrowRight size={17} /></a>
              <Link className="button button-outline" to="/contact">Request a Consultation</Link>
            </div>
          </div>
          <div className="services-visual" aria-hidden="true">
            <div className="services-visual-grid" />
            <div className="services-visual-panel">
              <div className="services-visual-header"><span>CAD SERVICE</span><Sparkles size={16} /></div>
              <div className="services-orbit"><Briefcase size={72} strokeWidth={1.2} /></div>
              <div className="services-visual-footer">SCOPED DELIVERY</div>
            </div>
          </div>
        </div>
      </section>

      <section className="services-section" id="service-list">
        <div className="site-container">
          <div className="services-section-heading centered-heading">
            <span className="categories-eyebrow">MATCH YOUR ENGINEERING NEEDS</span>
            <h2 className="section-heading">Available CAD service packages</h2>
          </div>

          <div className="admin-filters" style={{ marginBottom: '1.5rem' }}>
            <label>
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search service packages" />
            </label>
          </div>

          {error && <p className="admin-error" role="alert">{error}</p>}

          {loading ? (
            <p className="admin-state">Loading services...</p>
          ) : services.length === 0 ? (
            <p className="admin-state">No CAD services are available right now.</p>
          ) : (
            <div className="services-grid">
              {services.map((service) => (
                <article className="service-card" key={service.id}>
                  <div className="service-card-header">
                    <span className="service-tag">{service.category || 'CAD Service'}</span>
                    {service.startingPriceInPaise ? <strong>From ₹{(service.startingPriceInPaise / 100).toFixed(2)}</strong> : <strong>Custom Quote</strong>}
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.shortDescription}</p>
                  <ul className="service-feature-list">
                    {(service.features || []).slice(0, 4).map((feature) => (<li key={feature}>{feature}</li>))}
                  </ul>
                  <Link className="button button-primary" to={`/cad-services/${service.slug}`}>View Details <ArrowRight size={16} /></Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default CADServiceCatalog
