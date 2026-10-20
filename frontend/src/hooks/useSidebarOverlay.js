import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function useSidebarOverlay(isOpen, onClose, asideRef) {
  const location = useLocation()
  const close = typeof onClose === 'function' ? onClose : undefined

  useEffect(() => {
    close?.()
  }, [location.pathname])

  useEffect(() => {
    if (!isOpen) return undefined

    const syncBodyLock = () => {
      const isOverlaying = asideRef?.current && window.getComputedStyle(asideRef.current).position === 'fixed'
      document.body.style.overflow = isOverlaying ? 'hidden' : ''
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') close?.()
    }

    syncBodyLock()
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', syncBodyLock)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', syncBodyLock)
    }
  }, [isOpen])
}

export default useSidebarOverlay
