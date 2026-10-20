import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ContactForm from '../../components/contact/ContactForm/ContactForm.jsx'
import ContactInfo from '../../components/contact/ContactInfo/ContactInfo.jsx'
import coursesData from '../../data/courses.js'
import { getServiceBySlug } from '../../utils/cadServices.js'
import './Contact.css'

function Contact() {
  const [searchParams] = useSearchParams()
  const requestedServiceSlug = searchParams.get('service') || ''
  const requestedCourseSlug = searchParams.get('course') || ''
  const [selectedService, setSelectedService] = useState(null)
  const selectedCourse = requestedCourseSlug ? (coursesData.find((course) => course.slug === requestedCourseSlug) || { slug: requestedCourseSlug, title: requestedCourseSlug }) : null

  useEffect(() => {
    let active = true
    if (!requestedServiceSlug) { setSelectedService(null); return () => { active = false } }
    getServiceBySlug(requestedServiceSlug).then((service) => { if (active) setSelectedService(service) })
    return () => { active = false }
  }, [requestedServiceSlug])

  const selection = selectedService ? { type: 'service', serviceSlug: selectedService.slug, courseSlug: '', subject: `Inquiry about ${selectedService.title}` } : selectedCourse ? { type: 'course', serviceSlug: '', courseSlug: selectedCourse.slug, subject: `Inquiry about ${selectedCourse.title}` } : { type: 'general', serviceSlug: '', courseSlug: '', subject: '' }
  useEffect(() => { const previousTitle = document.title; document.title = 'Contact Us | CadTech Solution'; return () => { document.title = previousTitle } }, [])
  return <main className="contact-page"><section className="contact-hero" aria-labelledby="contact-heading"><div className="site-container"><nav className="contact-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><span aria-current="page">Contact</span></nav><span className="categories-eyebrow">GET IN TOUCH</span><h1 id="contact-heading">Let’s Discuss Your CAD or Engineering Project</h1><p>Contact us about CAD models, professional training, engineering services, or general platform questions.</p></div></section><section className="contact-main-section"><div className="site-container contact-layout"><ContactForm initialSelection={selection} selectedService={selectedService} selectedCourse={selectedCourse} /><ContactInfo /></div></section></main>
}

export default Contact