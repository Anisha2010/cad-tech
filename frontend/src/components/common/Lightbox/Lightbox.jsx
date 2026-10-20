import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import './Lightbox.css'

function Lightbox({ items, index, onClose, onIndexChange }) {
  const closeRef = useRef(null)
  const list = Array.isArray(items) ? items : []
  const isOpen = list.length > 0 && Number.isInteger(index) && index >= 0 && index < list.length
  const item = isOpen ? list[index] : null

  useEffect(() => {
    if (!isOpen) return undefined
    const trigger = document.activeElement
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onIndexChange((index + 1) % list.length)
      if (event.key === 'ArrowLeft') onIndexChange((index - 1 + list.length) % list.length)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (trigger instanceof HTMLElement && document.contains(trigger)) trigger.focus()
    }
  }, [isOpen, index, list.length, onClose, onIndexChange])

  if (!isOpen) return null

  const goPrevious = () => onIndexChange((index - 1 + list.length) % list.length)
  const goNext = () => onIndexChange((index + 1) % list.length)

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title} image preview`}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="lightbox-toolbar">
        <span className="lightbox-counter">{index + 1} / {list.length}</span>
        <button type="button" className="lightbox-close" ref={closeRef} onClick={onClose} aria-label="Close image preview">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="lightbox-stage">
        {list.length > 1 && (
          <button type="button" className="lightbox-nav lightbox-prev" onClick={goPrevious} aria-label="Previous project image">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        )}
        <figure className="lightbox-figure">
          <span className="lightbox-blueprint" aria-hidden="true" />
          <img
            src={item.imageUrl}
            alt={`${item.title} — ${item.category} project preview`}
            width="1200"
            height="800"
            decoding="async"
            onError={(event) => { event.currentTarget.style.display = 'none' }}
          />
          <figcaption>
            <span className="lightbox-category">{item.category}</span>
            <strong>{item.title}</strong>
            {item.summary && <span className="lightbox-summary">{item.summary}</span>}
          </figcaption>
        </figure>
        {list.length > 1 && (
          <button type="button" className="lightbox-nav lightbox-next" onClick={goNext} aria-label="Next project image">
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

export default Lightbox
