import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { useState } from 'react'
import testimonials from '../../../data/testimonials.js'
import './Testimonials.css'

function TestimonialCard({ testimonial }) {
  return (
    <article className="testimonial-card">
      <Quote className="testimonial-quote-icon" size={26} aria-hidden="true" />
      <blockquote>{testimonial.quote}</blockquote>
      <div className="testimonial-author">
        <span className="testimonial-avatar" aria-hidden="true">{testimonial.initials}</span>
        <div className="testimonial-author-details"><strong>{testimonial.name}</strong><span>{testimonial.role}</span></div>
      </div>
      {testimonial.isPlaceholder && <span className="demo-content-label">Demo content</span>}
    </article>
  )
}

function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeTestimonial = testimonials[activeIndex]

  return (
    <section className="testimonials-section" aria-labelledby="testimonials-heading">
      <div className="site-container">
        <div className="testimonials-heading">
          <span className="categories-eyebrow">LEARNER EXPERIENCES</span>
          <h2 className="section-heading" id="testimonials-heading">What Our Learners Say</h2>
          <p className="section-description">See how learners and designers use CadTech Solution to improve their CAD skills and project workflow.</p>
        </div>

        <div className="testimonials-grid">
          {testimonials.map((testimonial) => <TestimonialCard key={testimonial.id} testimonial={testimonial} />)}
        </div>

        <div className="testimonials-mobile-slider">
          <div aria-live="polite" className="slider-announcement">Showing testimonial {activeIndex + 1} of {testimonials.length}: {activeTestimonial.name}</div>
          <TestimonialCard testimonial={activeTestimonial} />
          <div className="slider-controls">
            <button type="button" className="slider-control" onClick={() => setActiveIndex((index) => index - 1)} disabled={activeIndex === 0} aria-label="Show previous testimonial"><ChevronLeft size={19} /></button>
            <span className="slider-position">{activeIndex + 1} / {testimonials.length}</span>
            <button type="button" className="slider-control" onClick={() => setActiveIndex((index) => index + 1)} disabled={activeIndex === testimonials.length - 1} aria-label="Show next testimonial"><ChevronRight size={19} /></button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Testimonials