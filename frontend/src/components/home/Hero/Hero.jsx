import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import './Hero.css'

function Hero() {
  const reduceMotion = useReducedMotion()
  const [imageUnavailable, setImageUnavailable] = useState(false)
  const animation = reduceMotion ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55 } }

  return (
    <section className="hero-section">
      <div className="hero-grid">
        <motion.div className="hero-copy" {...animation}>
          <div className="eyebrow"><CheckCircle2 size={16} /> Professional CAD &amp; Engineering Platform</div>
          <h1>
            Design. Learn.
            <span>Build the Future.</span>
          </h1>
          <p>Professional CAD models, engineering services, and industry-ready training—all in one platform.</p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/cad-models">Explore CAD Models <ArrowRight size={17} /></Link>
            <Link className="button button-outline" to="/courses">View Courses <ArrowRight size={17} /></Link>
          </div>
        </motion.div>
        <motion.div className="hero-visual" initial={reduceMotion ? false : { opacity: 0, x: 28 }} animate={reduceMotion ? undefined : { opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.12 }}>
          <div className="blueprint-grid" aria-hidden="true" />
          <div className="hero-glow" aria-hidden="true" />
          {imageUnavailable ? (
            <div className="image-fallback" role="img" aria-label="Mechanical CAD gearbox image unavailable">
              <span>CAD MODEL PREVIEW</span>
              <strong>Gearbox assembly</strong>
              <small>Place cad-gearbox-hero.webp in public/images/hero/</small>
            </div>
          ) : (
            <img className="hero-image" src="/images/hero/hero-gearbox.png" alt="Detailed mechanical gearbox CAD assembly" width="720" height="560" onError={() => setImageUnavailable(true)} />
          )}
        </motion.div>
      </div>
    </section>
  )
}

export default Hero
