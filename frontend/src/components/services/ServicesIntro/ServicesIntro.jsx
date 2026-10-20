import { ArrowRight, Mail, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { servicesIntroContent } from './servicesIntroContent.js'
import './ServicesIntro.css'

function ServicesIntro({ content = servicesIntroContent, settings = null, showCta = true }) {
  const copy = { ...servicesIntroContent, ...(content || {}) }
  const email = settings?.contactEmail?.trim() || 'arvind@cadtechsolution.com'
  const phone = settings?.contactPhone?.trim() || '+91 8839989046'
  const telHref = `tel:${phone.replace(/[^\d+]/g, '')}`

  return (
    <section className="services-intro-section" aria-labelledby="services-intro-heading">
      <div className="site-container">
        <div className="services-intro-card surface-dark">
          <div className="services-intro-blueprint" aria-hidden="true" />
          <div className="services-intro-copy">
            <span className="cta-eyebrow">{copy.eyebrow}</span>
            <h2 id="services-intro-heading">{copy.heading}</h2>
            <p>{copy.intro}</p>
            <div className="services-intro-contact">
              <a href={telHref}><Phone size={16} aria-hidden="true" /> {phone}</a>
              <a href={`mailto:${email}`}><Mail size={16} aria-hidden="true" /> {email}</a>
            </div>
          </div>
          {showCta && (
            <div className="services-intro-cta">
              <h3>{copy.ctaHeading}</h3>
              <p>{copy.ctaBody}</p>
              <Link className="button button-primary" to="/contact">Contact Us <ArrowRight size={17} /></Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default ServicesIntro
