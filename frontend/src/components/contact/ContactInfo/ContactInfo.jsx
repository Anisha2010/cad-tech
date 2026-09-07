import { Box, GraduationCap, Settings } from 'lucide-react'
import contactConfig from '../../../config/contact.js'
import './ContactInfo.css'

const helpCards = [
  { title: 'Engineering Services', description: 'Discuss CAD drafting, 3D modeling, product design, or technical documentation requirements.', icon: Settings },
  { title: 'Course Questions', description: 'Ask about course topics, learning levels, and available training.', icon: GraduationCap },
  { title: 'CAD Model Support', description: 'Get help exploring model categories, supported formats, and design resources.', icon: Box },
]

function ContactInfo() {
  return <aside className="contact-info-panel surface-dark"><span className="categories-eyebrow">SUPPORT WHEN YOU NEED IT</span><h2>How Can We Help?</h2><p className="contact-info-intro">Choose a topic and tell us what you are working on. We will keep the conversation focused on your requirements.</p><div className="contact-help-list">{helpCards.map(({ title, description, icon: Icon }) => <div className="contact-help-card" key={title}><div className="contact-help-icon"><Icon size={22} /></div><div><h3>{title}</h3><p>{description}</p></div></div>)}</div>{(contactConfig.email || contactConfig.phone || contactConfig.address) && <div className="verified-contact-details">{contactConfig.email && <a href={`mailto:${contactConfig.email}`}>{contactConfig.email}</a>}{contactConfig.phone && <a href={`tel:${contactConfig.phone}`}>{contactConfig.phone}</a>}{contactConfig.address && <span>{contactConfig.address}</span>}</div>}</aside>
}

export default ContactInfo