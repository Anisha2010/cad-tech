import { Box, Cpu } from 'lucide-react'
import { Link } from 'react-router-dom'
import categories from '../../../data/categories.js'
import './Footer.css'

const quickLinks = [
  ['Home', '/'], ['About', '/about'], ['CAD Models', '/cad-models'],
  ['Services', '/services'], ['Courses', '/courses'], ['Contact', '/contact'],
]

function Footer() {
  return (
    <footer className="site-footer surface-dark">
      <div className="site-container">
        <div className="footer-grid">
          <div className="footer-brand-column">
            <Link className="footer-brand" to="/"><span className="footer-brand-icon"><Cpu size={19} /></span><span>CadTech <strong>Solution</strong></span></Link>
            <p>Professional CAD models, engineering services, and practical training for designers and learners.</p>
          </div>
          <nav className="footer-column" aria-label="Quick links">
            <h2>Quick Links</h2>
            {quickLinks.map(([label, path]) => <Link key={path} to={path}>{label}</Link>)}
          </nav>
          <nav className="footer-column" aria-label="CAD categories">
            <h2>CAD Categories</h2>
            {categories.map((category) => <Link key={category.id} to={`/cad-models/${category.slug}`}>{category.title}</Link>)}
          </nav>
          <div className="footer-column footer-contact-column">
            <h2>Have a project in mind?</h2>
            <p>Contact us to discuss CAD design, training, or engineering requirements.</p>
            <Link className="footer-contact-link" to="/contact">Contact Us <Box size={16} /></Link>
          </div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} CadTech Solution. All rights reserved.</span><span>Built for Engineers. Designed for the Future.</span></div>
      </div>
    </footer>
  )
}

export default Footer