import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import './BackToTop.css'

const VISIBILITY_THRESHOLD = 400

function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)
  const [isInFooter, setIsInFooter] = useState(false)
  const buttonRef = useRef(null)
  const footerTopRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    const updateVisibility = () => {
      const footer = document.querySelector('.site-footer')
      const footerRect = footer?.getBoundingClientRect()
      const hasScrolled = window.scrollY > VISIBILITY_THRESHOLD
      const footerIsVisible = hasScrolled && footerRect && footerRect.top < window.innerHeight && footerRect.bottom > 0
      const footerTop = footerIsVisible && footerRect.top >= 12
        ? Math.min(footerRect.top, window.innerHeight - 68)
        : null
      const nextIsVisible = hasScrolled && (!footerIsVisible || footerTop !== null)
      const nextIsInFooter = footerTop !== null

      setIsVisible((previous) => previous === nextIsVisible ? previous : nextIsVisible)
      setIsInFooter((previous) => previous === nextIsInFooter ? previous : nextIsInFooter)
      footerTopRef.current = footerTop
      if (footerTop !== null) buttonRef.current?.style.setProperty('--back-to-top-top', `${footerTop}px`)
    }

    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })
    window.addEventListener('resize', updateVisibility)

    return () => {
      window.removeEventListener('scroll', updateVisibility)
      window.removeEventListener('resize', updateVisibility)
    }
  }, [location.pathname])

  const handleClick = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }

  if (!isVisible) return null

  const positionClass = isInFooter ? ' back-to-top--footer-top' : ''
  const button = (
    <button ref={buttonRef} className={`back-to-top${positionClass}`} style={{ '--back-to-top-top': `${footerTopRef.current ?? 16}px` }} type="button" onClick={handleClick} aria-label="Back to top">
      <ArrowUp size={22} aria-hidden="true" focusable="false" />
    </button>
  )

  return button
}

export default BackToTop