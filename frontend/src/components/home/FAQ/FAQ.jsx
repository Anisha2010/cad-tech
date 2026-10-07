import { Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getPublicFaqs } from '../../../services/siteContentService.js'
import './FAQ.css'

function FAQ() {
  const [faqs, setFaqs] = useState([])
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    let active = true
    getPublicFaqs().then((response) => {
      const items = response?.faqs || []
      if (active) {
        setFaqs(items)
        setOpenId(items[0]?.id ?? null)
      }
    }).catch(() => {
      if (active) {
        setFaqs([])
        setOpenId(null)
      }
    })

    return () => { active = false }
  }, [])

  const safeFaqs = faqs.length ? faqs : []
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
          {safeFaqs.map((faq) => {
            const faqId = faq.id || faq._id || faq.question
            const isOpen = openId === faqId
            const questionId = `faq-question-${faqId}`
            const answerId = `faq-answer-${faqId}`
            return (
              <div className={`faq-item ${isOpen ? 'is-open' : ''}`} key={faqId}>
                <h3 className="faq-question-heading">
                  <button className="faq-question" type="button" id={questionId} aria-expanded={isOpen} aria-controls={answerId} onClick={() => toggleFaq(faqId)}>
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