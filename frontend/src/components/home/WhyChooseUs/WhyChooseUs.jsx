import { ArrowRight, Box, CircleDot, Layers3, Ruler, ScanLine } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import features from '../../../data/features.js'
import './WhyChooseUs.css'

function WhyChooseUs() {
  const reduceMotion = useReducedMotion()
  const contentMotion = reduceMotion ? {} : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.5 } }

  return (
    <section className="why-choose-section" aria-labelledby="why-choose-heading">
      <div className="site-container why-choose-grid">
        <motion.div className="why-choose-content" {...contentMotion}>
          <span className="categories-eyebrow">WHY CHOOSE US</span>
          <h2 className="section-heading" id="why-choose-heading">Everything You Need to Design, Learn, and Build</h2>
          <p className="section-description">CadTech Solution brings professional CAD models, practical training, and engineering services together in one platform.</p>
          <div className="features-grid">
            {features.map(({ id, title, description, icon: Icon }) => (
              <div className="feature-item" key={id}>
                <div className="feature-icon"><Icon size={21} aria-hidden="true" /></div>
                <div><h3>{title}</h3><p>{description}</p></div>
              </div>
            ))}
          </div>
          <Link className="button button-primary why-choose-action" to="/about">Learn More About Us <ArrowRight size={17} /></Link>
        </motion.div>

        <motion.div className="engineering-visual" initial={reduceMotion ? false : { opacity: 0, x: 28 }} whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.65, delay: 0.08 }} aria-label="Engineering design visualization" role="img">
          <div className="visual-grid" aria-hidden="true" />
          <div className="visual-frame visual-frame-back" aria-hidden="true" />
          <div className="visual-frame visual-frame-front" aria-hidden="true">
            <div className="visual-header"><span>CAD / 03</span><ScanLine size={17} /></div>
            <div className="cad-orbit"><CircleDot className="orbit-dot orbit-dot-one" size={15} /><CircleDot className="orbit-dot orbit-dot-two" size={13} /><Box className="cad-box" size={108} strokeWidth={1.1} /></div>
            <div className="visual-ruler"><Ruler size={15} /><span>PRECISION WORKFLOW</span></div>
          </div>
          <div className="visual-label label-modeling"><Layers3 size={15} /> 3D Modeling</div>
          <div className="visual-label label-training">CAD Training</div>
          <div className="visual-label label-design">Engineering Design</div>
        </motion.div>
      </div>
    </section>
  )
}

export default WhyChooseUs