import { ArrowRight, Box, Compass, Cpu, Layers3, Ruler, ScanLine } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { approachSteps, coreValues, missionVision, supportAreas } from '../../data/about.js'
import './About.css'

function About() {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'About Us | CadTech Solution'
    return () => { document.title = previousTitle }
  }, [])

  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 }, transition: { duration: 0.5 } }

  return (
    <main className="about-page">
      <section className="about-hero" aria-labelledby="about-hero-heading">
        <div className="site-container about-hero-grid">
          <motion.div className="about-hero-copy" {...reveal}>
            <span className="categories-eyebrow">ABOUT CADTECH SOLUTION</span>
            <h1 id="about-hero-heading">Helping Engineers Design, Learn, and Build with Confidence</h1>
            <p>CadTech Solution brings together practical CAD training, organized design resources, and engineering services in one accessible platform.</p>
            <div className="about-actions"><Link className="button button-primary" to="/courses">Explore Our Courses <ArrowRight size={17} /></Link><Link className="button button-outline" to="/contact">Contact Us <ArrowRight size={17} /></Link></div>
          </motion.div>
          <AboutVisual />
        </div>
      </section>

      <section className="about-section" aria-labelledby="mission-heading"><div className="site-container"><div className="about-section-heading"><span className="categories-eyebrow">OUR DIRECTION</span><h2 className="section-heading" id="mission-heading">Purpose Built for Practical Progress</h2></div><div className="mission-grid">{missionVision.map(({ id, title, description, icon: Icon }) => <motion.article className="about-info-card" key={id} {...reveal}><div className="about-card-icon"><Icon size={25} /></div><h3>{title}</h3><p>{description}</p></motion.article>)}</div></div></section>

      <section className="about-section about-alt-section" aria-labelledby="support-heading"><div className="site-container"><div className="about-section-heading centered-heading"><span className="categories-eyebrow">WHAT WE DO</span><h2 className="section-heading" id="support-heading">How We Support Your Engineering Journey</h2></div><div className="support-grid">{supportAreas.map(({ id, title, description, icon: Icon, path }) => <Link className="about-info-card support-card" to={path} key={id}><div className="about-card-icon"><Icon size={25} /></div><h3>{title}</h3><p>{description}</p><span className="about-inline-link">Explore <ArrowRight size={16} /></span></Link>)}</div></div></section>

      <section className="about-section" aria-labelledby="approach-heading"><div className="site-container"><div className="about-section-heading centered-heading"><span className="categories-eyebrow">OUR APPROACH</span><h2 className="section-heading" id="approach-heading">A Practical Approach to Engineering Growth</h2></div><div className="approach-grid">{approachSteps.map(({ id, title, description, icon: Icon }) => <motion.div className="approach-step" key={id} {...reveal}><span className="step-number">{id}</span><div className="approach-icon"><Icon size={22} /></div><h3>{title}</h3><p>{description}</p></motion.div>)}</div></div></section>

      <section className="about-section about-alt-section" aria-labelledby="values-heading"><div className="site-container"><div className="about-section-heading centered-heading"><span className="categories-eyebrow">CORE VALUES</span><h2 className="section-heading" id="values-heading">What Guides Us</h2></div><div className="values-grid">{coreValues.map(({ id, title, description, icon: Icon }) => <div className="value-card" key={id}><Icon size={21} className="value-icon" /><h3>{title}</h3><p>{description}</p></div>)}</div></div></section>

      <section className="about-final-cta" aria-labelledby="about-cta-heading"><div className="site-container about-final-cta-inner"><div className="about-cta-grid" aria-hidden="true" /><div><span className="cta-eyebrow">START WITH CADTECH</span><h2 id="about-cta-heading">Ready to Start Your CAD Journey?</h2><p>Explore our training, discover CAD resources, or contact us about your project.</p></div><div className="about-actions"><Link className="button button-primary" to="/courses">Browse Courses <ArrowRight size={17} /></Link><Link className="button cta-secondary-button" to="/contact">Talk to Us <ArrowRight size={17} /></Link></div></div></section>
    </main>
  )
}

function AboutVisual() {
  return <div className="about-visual" role="img" aria-label="Engineering design workspace visualization"><div className="about-visual-grid" /><div className="about-visual-panel"><div className="about-visual-top"><span>CAD / ABOUT</span><ScanLine size={16} /></div><div className="about-orbit"><Cpu className="about-cpu" size={84} strokeWidth={1.15} /><span className="about-orbit-dot" /></div><div className="about-visual-bottom"><Ruler size={15} /> PRECISION WORKFLOW</div></div><div className="about-visual-label about-label-one"><Box size={15} /> DESIGN RESOURCES</div><div className="about-visual-label about-label-two"><Compass size={15} /> PRACTICAL GROWTH</div><div className="about-visual-label about-label-three"><Layers3 size={15} /> ENGINEERING</div></div>
}

export default About