import { Box, Cpu, Facebook, Instagram, Linkedin, Youtube } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCadCategories } from '../../../services/cadService.js'
import { getPublicSiteSettings } from '../../../services/siteContentService.js'
import './Footer.css'

const quickLinks = [
  ['Home', '/'], ['About', '/about'], ['CAD Models', '/cad-models'],
  ['Services', '/services'], ['Courses', '/courses'], ['Contact', '/contact'],
]

const socialPlatforms = [
  ['facebook', 'Facebook', Facebook],
  ['linkedin', 'LinkedIn', Linkedin],
  ['instagram', 'Instagram', Instagram],
  ['youtube', 'YouTube', Youtube]
]

function Footer() {
  const [categories, setCategories] = useState([])
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    let active = true
    Promise.all([
      getCadCategories(),
      getPublicSiteSettings()
    ]).then(([items, siteSettings]) => {
      if (!active) return
      setCategories(items || [])
      setSettings(siteSettings?.settings || null)
    }).catch(() => {
      if (active) {
        setCategories([])
        setSettings(null)
      }
    })
    return () => { active = false }
  }, [])

  const brandName = settings?.brandName || settings?.businessName || 'CadTech Solution'
  const tagline = settings?.tagline || 'Professional CAD models, engineering services, and practical training for designers and learners.'
  const contactEmail = settings?.contactEmail || 'arvind@cadtechsolution.com'
  const contactPhone = settings?.contactPhone || '+91 88399 89046'
  const socialLinks = socialPlatforms.filter(([key]) => {
    const value = settings?.socialLinks?.[key]
    if (!value) return false
    try {
      return ['https:', 'http:'].includes(new URL(value).protocol)
    } catch {
      return false
    }
  })

  return (
    <footer className="site-footer surface-dark">
      <div className="site-container">
        <div className="footer-grid">
          <div className="footer-brand-column">
            <Link className="footer-brand" to="/"><span className="footer-brand-icon"><Cpu size={19} /></span><span>{brandName}</span></Link>
            <p>{tagline}</p>
            {socialLinks.length > 0 && <nav className="footer-social-links" aria-label="Social media">
              {socialLinks.map(([key, label, Icon]) => <a key={key} href={settings.socialLinks[key]} target="_blank" rel="noreferrer" aria-label={label} title={label}><Icon size={18} aria-hidden="true" /></a>)}
            </nav>}
          </div>
          <nav className="footer-column" aria-label="Quick links">
            <h2>Quick Links</h2>
            {quickLinks.map(([label, path]) => <Link key={path} to={path}>{label}</Link>)}
          </nav>
          <nav className="footer-column" aria-label="CAD categories">
            <h2>CAD Categories</h2>
            {categories.map((category) => <Link key={category.id} to={`/cad-models/${category.slug}`}>{category.name}</Link>)}
          </nav>
          <nav className="footer-column footer-legal-column" aria-label="Legal information">
            <h2>Legal Information</h2>
            <Link to="/legal">Business information</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
            <Link to="/terms#disclaimer">Disclaimer</Link>
            <Link to="/digital-item-policy">Digital Item Policy</Link>
            <Link to="/refund-policy">Refund Policy</Link>
          </nav>
          <div className="footer-column footer-contact-column">
            <h2>Have a project in mind?</h2>
            <p>Contact us to discuss CAD design, training, or engineering requirements.</p>
            <a className="footer-contact-link" href={`mailto:${contactEmail}`}>Contact Us <Box size={16} /></a>
            {contactPhone && <a className="footer-contact-link" href={`tel:${contactPhone}`}>{contactPhone}</a>}
          </div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span><span>Built for Engineers. Designed for the Future.</span></div>
      </div>
    </footer>
  )
}

export default Footer