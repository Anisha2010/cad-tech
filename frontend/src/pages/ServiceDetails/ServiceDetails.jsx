import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import ServiceCard from '../../components/services/ServiceCard/ServiceCard.jsx'
import ServiceProcess from '../../components/services/ServiceProcess/ServiceProcess.jsx'
import services from '../../data/services.js'
import './ServiceDetails.css'

function ServiceDetails() {
  const { slug } = useParams()
  const service = services.find((item) => item.slug === slug)
  useEffect(() => { const previousTitle = document.title; document.title = service ? `${service.title} | CadTech Solution` : 'Service Not Found | CadTech Solution'; return () => { document.title = previousTitle } }, [service])
  if (!service) return <main className="service-details page-placeholder"><h1>Service not found</h1><Link className="button button-primary" to="/services">Back to Services</Link></main>
  const Icon = service.icon
  const relatedServices = services.filter((item) => item.id !== service.id).slice(0, 3)
  return <main className="service-details"><div className="site-container"><nav className="service-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/services">Services</Link><span>/</span><span aria-current="page">{service.title}</span></nav><section className="service-detail-hero"><div className="service-detail-icon"><Icon size={38} /></div><span className="categories-eyebrow">ENGINEERING SERVICE</span><h1>{service.title}</h1><p>{service.description}</p><div className="service-detail-actions"><Link className="button button-primary" to={`/contact?service=${service.slug}`}>Discuss This Service <ArrowRight size={17} /></Link><Link className="button button-outline" to="/services"><ArrowLeft size={17} /> Back to Services</Link></div></section><section className="service-detail-section" aria-labelledby="service-features-heading"><div className="service-detail-section-heading"><span className="categories-eyebrow">WHAT IS INCLUDED</span><h2 className="section-heading" id="service-features-heading">A focused approach for your requirements</h2></div><ul className="service-feature-list">{service.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></section><ServiceProcess /><section className="related-services" aria-labelledby="related-services-heading"><div className="centered-heading"><span className="categories-eyebrow">EXPLORE MORE</span><h2 className="section-heading" id="related-services-heading">Related Services</h2></div><div className="related-services-grid">{relatedServices.map((related) => <ServiceCard service={related} key={related.id} />)}</div></section><section className="service-detail-cta" aria-labelledby="service-detail-cta-heading"><h2 id="service-detail-cta-heading">Have an Engineering Project in Mind?</h2><p>Tell us about your requirements and explore the right CAD or engineering service for your project.</p><Link className="button button-primary" to={`/contact?service=${service.slug}`}>Contact Us <ArrowRight size={17} /></Link></section></div></main>
}

export default ServiceDetails