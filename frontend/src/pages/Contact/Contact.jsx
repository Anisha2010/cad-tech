import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ContactForm from '../../components/contact/ContactForm/ContactForm.jsx'
import ContactInfo from '../../components/contact/ContactInfo/ContactInfo.jsx'
import services from '../../data/services.js'
import './Contact.css'

function Contact() {
  const [searchParams] = useSearchParams()
  const selectedService = services.find((service) => service.slug === searchParams.get('service'))
  const requestedCourseSlug = searchParams.get('course') || ''
  const selection = selectedService ? { type: 'service', serviceSlug: selectedService.slug, courseSlug: '', subject: `Inquiry about ${selectedService.title}` } : requestedCourseSlug ? { type: 'course', serviceSlug: '', courseSlug: requestedCourseSlug, subject: `Inquiry about ${requestedCourseSlug}` } : { type: 'general', serviceSlug: '', courseSlug: '', subject: '' }
  useEffect(() => { const previousTitle = document.title; document.title = 'Contact Us | CadTech Solution'; return () => { document.title = previousTitle } }, [])
  return <main className="contact-page"><section className="contact-hero" aria-labelledby="contact-heading"><div className="site-container"><nav className="contact-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><span aria-current="page">Contact</span></nav><span className="categories-eyebrow">GET IN TOUCH</span><h1 id="contact-heading">Let’s Discuss Your CAD or Engineering Project</h1><p>Contact us about CAD models, professional training, engineering services, or general platform questions.</p></div></section><section className="contact-main-section"><div className="site-container contact-layout"><ContactForm initialSelection={selection} /><ContactInfo /></div></section></main>
}

export default Contact