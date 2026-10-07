import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getPublicTestimonials } from '../../../services/siteContentService.js'
import './Testimonials.css'

function TestimonialCard({ testimonial }) {
  if (!testimonial || typeof testimonial !== 'object') {
    return null
  }

  const quote = testimonial.quote || 'No review provided yet.'
  const name = testimonial.name || 'Anonymous learner'
  const role = testimonial.role || 'Learner'
  const initials = testimonial.initials || name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'AL'

  return (
    <article className="testimonial-card">
      <Quote className="testimonial-quote-icon" size={26} aria-hidden="true" />
      <blockquote>{quote}</blockquote>
      <div className="testimonial-author">
        <span className="testimonial-avatar" aria-hidden="true">{initials}</span>
        <div className="testimonial-author-details"><strong>{name}</strong><span>{role}</span></div>
      </div>
      {testimonial.isPlaceholder && <span className="demo-content-label">Demo content</span>}
    </article>
  )
}

function Testimonials() {
  const [testimonials, setTestimonials] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    let active = true
    getPublicTestimonials().then((response) => {
      const items = Array.isArray(response?.testimonials) ? response.testimonials.filter(Boolean) : []
      if (active) setTestimonials(items)
    }).catch(() => {
      if (active) setTestimonials([])
    })

    return () => { active = false }
  }, [])

  const safeTestimonials = Array.isArray(testimonials) ? testimonials.filter(Boolean) : []
  const activeTestimonial = safeTestimonials[activeIndex] || safeTestimonials[0]

  const showEmptyState = safeTestimonials.length === 0

  return (
    <section className="testimonials-section" aria-labelledby="testimonials-heading">
      <div className="site-container">
        <div className="testimonials-heading">
          <span className="categories-eyebrow">LEARNER EXPERIENCES</span>
          <h2 className="section-heading" id="testimonials-heading">What Our Learners Say</h2>
          <p className="section-description">See how learners and designers use CadTech Solution to improve their CAD skills and project workflow.</p>
        </div>
        {!showEmptyState && (
          <div className="testimonials-grid">
            {safeTestimonials.map((testimonial, index) => <TestimonialCard key={testimonial?.id || testimonial?._id || testimonial?.name || index} testimonial={testimonial} />)}
          </div>
        )}

        {!showEmptyState && (
          <div className="testimonials-mobile-slider">
            <div aria-live="polite" className="slider-announcement">Showing testimonial {activeIndex + 1} of {safeTestimonials.length}: {activeTestimonial?.name || 'Testimonial'}</div>
            <TestimonialCard testimonial={activeTestimonial} />
            <div className="slider-controls">
              <button type="button" className="slider-control" onClick={() => setActiveIndex((index) => Math.max(0, index - 1))} disabled={activeIndex === 0 || safeTestimonials.length <= 1} aria-label="Show previous testimonial"><ChevronLeft size={19} /></button>
              <span className="slider-position">{safeTestimonials.length ? activeIndex + 1 : 0} / {safeTestimonials.length}</span>
              <button type="button" className="slider-control" onClick={() => setActiveIndex((index) => Math.min(safeTestimonials.length - 1, index + 1))} disabled={activeIndex >= safeTestimonials.length - 1 || safeTestimonials.length <= 1} aria-label="Show next testimonial"><ChevronRight size={19} /></button>
            </div>
          </div>
        )}

        {showEmptyState && (
          <div className="testimonials-mobile-slider">
            <div className="slider-announcement">No testimonials are available right now.</div>
          </div>
        )}
      </div>
    </section>
  )
}

export default Testimonials