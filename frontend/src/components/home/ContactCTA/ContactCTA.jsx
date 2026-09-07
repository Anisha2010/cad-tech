import { ArrowRight, Box, Cpu, Ruler } from 'lucide-react'
import { Link } from 'react-router-dom'
import './ContactCTA.css'

function ContactCTA() {
  return (
    <section className="contact-cta-section" aria-labelledby="contact-cta-heading">
      <div className="site-container contact-cta-inner surface-dark">
        <div className="cta-blueprint" aria-hidden="true" />
        <div className="contact-cta-copy">
          <span className="cta-eyebrow">CADTECH SOLUTION</span>
          <h2 id="contact-cta-heading">Ready to Design, Learn, and Build the Future?</h2>
          <p>Explore professional CAD models, develop practical skills, and discover engineering solutions for your next project.</p>
        </div>
        <div className="contact-cta-actions">
          <Link className="button button-primary" to="/cad-models">Explore CAD Models <ArrowRight size={17} /></Link>
          <Link className="button cta-secondary-button" to="/courses">View Courses <ArrowRight size={17} /></Link>
        </div>
        <div className="cta-shape cta-shape-one"><Cpu size={24} /></div>
        <div className="cta-shape cta-shape-two"><Box size={18} /></div>
        <div className="cta-shape cta-shape-three"><Ruler size={18} /></div>
      </div>
    </section>
  )
}

export default ContactCTA