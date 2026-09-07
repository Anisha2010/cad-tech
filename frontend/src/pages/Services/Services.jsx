import { ArrowRight, Box, Cpu, Layers3, Ruler, ScanLine } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import ServiceCard from '../../components/services/ServiceCard/ServiceCard.jsx'
import ServiceProcess from '../../components/services/ServiceProcess/ServiceProcess.jsx'
import services from '../../data/services.js'
import './Services.css'

function Services() {
  const reduceMotion = useReducedMotion()
  useEffect(() => { const previousTitle = document.title; document.title = 'Engineering Services | CadTech Solution'; return () => { document.title = previousTitle } }, [])
  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 }, transition: { duration: 0.5 } }

  return <main className="services-page">
    <section className="services-hero" aria-labelledby="services-hero-heading"><div className="site-container services-hero-grid"><motion.div className="services-hero-copy" {...reveal}><span className="categories-eyebrow">PROFESSIONAL ENGINEERING SERVICES</span><h1 id="services-hero-heading">Engineering Design Services Built Around Your Project</h1><p>From accurate CAD drafting to detailed 3D modeling, explore practical engineering design services tailored to your project requirements.</p><div className="services-actions"><a className="button button-primary" href="#services-list">Explore Services <ArrowRight size={17} /></a><Link className="button button-outline" to="/contact">Discuss Your Project <ArrowRight size={17} /></Link></div></motion.div><ServicesVisual /></div></section>
    <section className="services-section" id="services-list" aria-labelledby="services-list-heading"><div className="site-container"><div className="services-section-heading centered-heading"><span className="categories-eyebrow">OUR CAPABILITIES</span><h2 className="section-heading" id="services-list-heading">Explore Our Engineering Services</h2><p className="section-description">Choose the type of engineering support that matches your project.</p></div><div className="services-grid">{services.map((service) => <ServiceCard service={service} key={service.id} />)}</div><ServiceProcess /></div></section>
    <section className="services-final-cta" aria-labelledby="services-cta-heading"><div className="site-container services-cta-inner"><div className="services-cta-grid" aria-hidden="true" /><div><span className="cta-eyebrow">START YOUR PROJECT</span><h2 id="services-cta-heading">Have an Engineering Project in Mind?</h2><p>Tell us about your requirements and explore the right CAD or engineering service for your project.</p></div><Link className="button button-primary" to="/contact">Contact Us <ArrowRight size={17} /></Link></div></section>
  </main>
}

function ServicesVisual() { return <div className="services-visual" role="img" aria-label="Engineering design workflow visualization"><div className="services-visual-grid" /><div className="services-visual-panel"><div className="services-visual-header"><span>PROJECT / CAD</span><ScanLine size={16} /></div><div className="services-orbit"><Cpu size={88} strokeWidth={1.1} /><span /></div><div className="services-visual-footer"><Ruler size={15} /> PRECISION WORKFLOW</div></div><div className="services-visual-label label-one"><Box size={15} /> 3D MODELING</div><div className="services-visual-label label-two"><Layers3 size={15} /> TECHNICAL DESIGN</div></div> }

export default Services