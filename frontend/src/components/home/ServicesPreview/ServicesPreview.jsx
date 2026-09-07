import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import services from '../../../data/services.js'
import './ServicesPreview.css'

function ServicesPreview() {
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
          {services.map(({ id, title, description, icon: Icon, slug }) => (
            <Link className="service-preview-card" to="/services" key={id} aria-label={`Learn more about ${title}`}>
              <div className={`service-icon service-icon-${slug}`}><Icon size={29} strokeWidth={1.8} aria-hidden="true" /></div>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="service-learn-more">Learn More <ArrowRight size={16} /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ServicesPreview