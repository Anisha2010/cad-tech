import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import faqs from '../../../data/faqs.js'
import './FAQ.css'

function FAQ() {
  const [openId, setOpenId] = useState(faqs[0]?.id ?? null)

  const toggleFaq = (id) => setOpenId((currentId) => currentId === id ? null : id)

  return (
    <section className="faq-section" aria-labelledby="faq-heading">
      <div className="site-container">
        <div className="faq-heading">
          <span className="categories-eyebrow">COMMON QUESTIONS</span>
          <h2 className="section-heading" id="faq-heading">Frequently Asked Questions</h2>
          <p className="section-description">Find quick answers about CAD models, courses, engineering services, and platform access.</p>
        </div>

        <div className="faq-list">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id
            const questionId = `faq-question-${faq.id}`
            const answerId = `faq-answer-${faq.id}`
            return (
              <div className={`faq-item ${isOpen ? 'is-open' : ''}`} key={faq.id}>
                <h3 className="faq-question-heading">
                  <button className="faq-question" type="button" id={questionId} aria-expanded={isOpen} aria-controls={answerId} onClick={() => toggleFaq(faq.id)}>
                    <span>{faq.question}</span>
                    {isOpen ? <Minus size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
                  </button>
                </h3>
                <div className="faq-answer-shell" id={answerId} role="region" aria-labelledby={questionId} aria-hidden={!isOpen}>
                  <div className="faq-answer"><p>{faq.answer}</p></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FAQ