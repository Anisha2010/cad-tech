import { ArrowRight, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getServicesForDisplay } from '../../../utils/cadServices.js'
import './ServicesPreview.css'

function ServicesPreview() {
  const [services, setServices] = useState([])

  useEffect(() => {
    let active = true
    getServicesForDisplay().then((items) => { if (active) setServices(items.slice(0, 6)) })
    return () => { active = false }
  }, [])

  return (
    <section className="services-preview-section" aria-labelledby="services-preview-heading">
      <div className="site-container">
        <div className="services-preview-heading-row">
          <div>
            <span className="categories-eyebrow">OUR EXPERTISE</span>
            <h2 className="section-heading" id="services-preview-heading">Engineering Services</h2>
            <p className="section-description">Professional CAD design and engineering solutions tailored to your project requirements.</p>
          </div>
          <Link className="view-all-link" to="/services">View All Services <ArrowRight size={17} /></Link>
        </div>

        <div className="services-preview-grid">
          {services.map((service) => {
            const Icon = service.icon || Settings
            return (
              <Link className="service-preview-card" to={`/services/${service.slug}`} key={service.id} aria-label={`Learn more about ${service.title}`}>
                {service.thumbnail
                  ? <div className="service-preview-media"><img src={service.thumbnail} alt="" loading="lazy" /></div>
                  : <div className={`service-icon service-icon-${service.slug}`}><Icon size={29} strokeWidth={1.8} aria-hidden="true" /></div>}
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <span className="service-learn-more">Learn More <ArrowRight size={16} /></span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default ServicesPreview