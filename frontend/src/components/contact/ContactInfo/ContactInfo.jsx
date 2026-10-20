import { Box, GraduationCap, Settings } from 'lucide-react'
import CompanyDetails from '../../common/CompanyDetails/CompanyDetails.jsx'
import './ContactInfo.css'

const helpCards = [
  { title: 'Engineering Services', description: 'Discuss CAD drafting, 3D modeling, product design, or technical documentation requirements.', icon: Settings },
  { title: 'Course Questions', description: 'Ask about course topics, learning levels, and available training.', icon: GraduationCap },
  { title: 'CAD Model Support', description: 'Get help exploring model categories, supported formats, and design resources.', icon: Box },
]

function ContactInfo() {
  return <aside className="contact-info-panel"><span className="categories-eyebrow">SUPPORT WHEN YOU NEED IT</span><h2>How Can We Help?</h2><p className="contact-info-intro">Choose a topic and tell us what you are working on. We will keep the conversation focused on your requirements.</p><div className="contact-help-list">{helpCards.map(({ title, description, icon: Icon }) => <div className="contact-help-card" key={title}><div className="contact-help-icon"><Icon size={22} /></div><div><h3>{title}</h3><p>{description}</p></div></div>)}</div><div className="contact-company-block"><h3>Company Details</h3><CompanyDetails variant="panel" /></div></aside>
}

export default ContactInfo