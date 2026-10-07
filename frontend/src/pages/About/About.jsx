import { ArrowRight, Box, Compass, Cpu, Layers3, Ruler, ScanLine, UserRound } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { founder } from '../../data/about.js'
import { getPublicAboutContent, getPublicSiteSettings } from '../../services/siteContentService.js'
import './About.css'

const defaultAbout = {
  pageTitle: 'About CadTech Solution',
  intro: 'CadTech Solution brings together practical CAD training, organized design resources, and engineering services.',
  mission: 'Make professional CAD knowledge and engineering support easier to access for learners and businesses.',
  vision: 'Build a practical digital platform where engineering education and design resources work together.',
  supportAreas: ['CAD models', 'engineering services', 'professional training'],
  values: ['Practical learning', 'Accessible resources', 'Quality design'],
  finalCta: 'Ready to start your CAD journey?'
}

const defaultFounderPortrait = '/hero/founder.jpg'

function About() {
  const reduceMotion = useReducedMotion()
  const [aboutData, setAboutData] = useState(defaultAbout)
  const [founderPortraitUrl, setFounderPortraitUrl] = useState(defaultFounderPortrait)
  const [founderPortraitLoaded, setFounderPortraitLoaded] = useState(false)

  useEffect(() => {
    let active = true
    const previousTitle = document.title
    document.title = `${aboutData.pageTitle || 'About Us'} | CadTech Solution`

    getPublicAboutContent().then((response) => {
      if (active && response?.about) setAboutData(response.about)
    }).catch(() => {
      if (active) setAboutData(defaultAbout)
    })

    getPublicSiteSettings().then((response) => {
      if (!active) return
      const founderImageUrl = response?.settings?.founderImageUrl?.trim()
      const heroImageUrl = response?.settings?.heroImageUrl?.trim()
      const savedPortraitUrl = founderImageUrl || heroImageUrl || defaultFounderPortrait
      setFounderPortraitUrl(savedPortraitUrl)
      setFounderPortraitLoaded(false)
    }).catch(() => {
      if (active) {
        setFounderPortraitUrl(defaultFounderPortrait)
        setFounderPortraitLoaded(false)
      }
    })

    return () => {
      active = false
      document.title = previousTitle
    }
  }, [])

  useEffect(() => {
    document.title = `${aboutData.pageTitle || 'About Us'} | CadTech Solution`
  }, [aboutData.pageTitle])

  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 }, transition: { duration: 0.5 } }

  const missionVision = [
    { id: 1, title: 'Our Mission', description: aboutData.mission, icon: Box },
    { id: 2, title: 'Our Vision', description: aboutData.vision, icon: Compass }
  ]

  const supportAreas = [
    { id: 1, title: 'CAD Models', description: aboutData.supportAreas[0] || 'CAD models', icon: Box, path: '/cad-models' },
    { id: 2, title: 'Engineering Services', description: aboutData.supportAreas[1] || 'Engineering services', icon: Ruler, path: '/services' },
    { id: 3, title: 'Professional Training', description: aboutData.supportAreas[2] || 'Professional training', icon: Layers3, path: '/courses' }
  ]

  const coreValues = [
    { id: 1, title: 'Practical Learning', description: aboutData.values[0] || 'Practical learning', icon: Layers3 },
    { id: 2, title: 'Accessible Resources', description: aboutData.values[1] || 'Accessible resources', icon: Compass },
    { id: 3, title: 'Quality Design', description: aboutData.values[2] || 'Quality design', icon: Box }
  ]

  return (
    <main className="about-page">
      <section className="about-hero" aria-labelledby="about-hero-heading">
        <div className="site-container about-hero-grid">
          <motion.div className="about-hero-copy" {...reveal}>
            <span className="categories-eyebrow">ABOUT CADTECH SOLUTION</span>
            <h1 id="about-hero-heading">{aboutData.pageTitle || 'About CadTech Solution'}</h1>
            <p>{aboutData.intro}</p>
            <div className="about-actions"><Link className="button button-primary" to="/courses">Explore Our Courses <ArrowRight size={17} /></Link><Link className="button button-outline" to="/contact">Contact Us <ArrowRight size={17} /></Link></div>
          </motion.div>
          <AboutVisual />
        </div>
      </section>

      <section className="founder-section" aria-labelledby="founder-heading">
        <div className="site-container founder-grid">
          <motion.div className="founder-portrait" role="img" aria-label={`${founder.portraitLabel} for ${founder.name}`}>
            <img className="founder-portrait-image" src={founderPortraitUrl} alt={`${founder.name}, ${founder.designation}`} onLoad={() => setFounderPortraitLoaded(true)} onError={() => setFounderPortraitLoaded(false)} />
            {!founderPortraitLoaded && <>
              <div className="founder-portrait-grid" aria-hidden="true" />
              <div className="founder-portrait-mark" aria-hidden="true"><UserRound size={58} strokeWidth={1.2} /></div>
              <span className="founder-portrait-caption">{founder.portraitLabel}</span>
            </>}
          </motion.div>
          <motion.div className="founder-copy">
            <span className="categories-eyebrow">{founder.sectionLabel}</span>
            <h2 className="section-heading" id="founder-heading">{founder.heading}</h2>
            <h3 className="founder-name">{founder.name}</h3>
            <p className="founder-designation">{founder.designation}</p>
            <div className="founder-biography">
              {founder.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="about-section" aria-labelledby="mission-heading"><div className="site-container"><div className="about-section-heading"><span className="categories-eyebrow">OUR DIRECTION</span><h2 className="section-heading" id="mission-heading">Purpose Built for Practical Progress</h2></div><div className="mission-grid">{missionVision.map(({ id, title, description, icon: Icon }) => <motion.article className="about-info-card" key={id} {...reveal}><div className="about-card-icon"><Icon size={25} /></div><h3>{title}</h3><p>{description}</p></motion.article>)}</div></div></section>

      <section className="about-section about-alt-section" aria-labelledby="support-heading"><div className="site-container"><div className="about-section-heading centered-heading"><span className="categories-eyebrow">WHAT WE DO</span><h2 className="section-heading" id="support-heading">How We Support Your Engineering Journey</h2></div><div className="support-grid">{supportAreas.map(({ id, title, description, icon: Icon, path }) => <Link className="about-info-card support-card" to={path} key={id}><div className="about-card-icon"><Icon size={25} /></div><h3>{title}</h3><p>{description}</p><span className="about-inline-link">Explore <ArrowRight size={16} /></span></Link>)}</div></div></section>

      <section className="about-section about-alt-section" aria-labelledby="values-heading"><div className="site-container"><div className="about-section-heading centered-heading"><span className="categories-eyebrow">CORE VALUES</span><h2 className="section-heading" id="values-heading">What Guides Us</h2></div><div className="values-grid">{coreValues.map(({ id, title, description, icon: Icon }) => <div className="value-card" key={id}><Icon size={21} className="value-icon" /><h3>{title}</h3><p>{description}</p></div>)}</div></div></section>

      <section className="about-final-cta" aria-labelledby="about-cta-heading"><div className="site-container about-final-cta-inner"><div className="about-cta-grid" aria-hidden="true" /><div><span className="cta-eyebrow">START WITH CADTECH</span><h2 id="about-cta-heading">{aboutData.finalCta || 'Ready to start your CAD journey?'}</h2><p>Explore our training, discover CAD resources, or contact us about your project.</p></div><div className="about-actions"><Link className="button button-primary" to="/courses">Browse Courses <ArrowRight size={17} /></Link><Link className="button cta-secondary-button" to="/contact">Talk to Us <ArrowRight size={17} /></Link></div></div></section>
    </main>
  )
}

function AboutVisual() {
  return <div className="about-visual" role="img" aria-label="Engineering design workspace visualization"><div className="about-visual-grid" /><div className="about-visual-panel"><div className="about-visual-top"><span>CAD / ABOUT</span><ScanLine size={16} /></div><div className="about-orbit"><Cpu className="about-cpu" size={84} strokeWidth={1.15} /><span className="about-orbit-dot" /></div><div className="about-visual-bottom"><Ruler size={15} /> PRECISION WORKFLOW</div></div><div className="about-visual-label about-label-one"><Box size={15} /> DESIGN RESOURCES</div><div className="about-visual-label about-label-two"><Compass size={15} /> PRACTICAL GROWTH</div><div className="about-visual-label about-label-three"><Layers3 size={15} /> ENGINEERING</div></div>
}

export default About