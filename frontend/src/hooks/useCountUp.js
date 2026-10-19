import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'
import { getCountAnimationConfig } from '../utils/countAnimation.js'

function useCountUp(value, options = {}) {
  const { duration = 1600, once = true } = options
  const reduceMotion = useReducedMotion()
  const ref = useRef(null)
  const isInView = useInView(ref, { once, amount: 0.35 })
  const [count, setCount] = useState(reduceMotion ? getCountAnimationConfig(value).end : 0)

  useEffect(() => {
    if (reduceMotion) return
    if (!isInView) return

    const config = getCountAnimationConfig(value)
    let frameId
    let startTime

    const tick = (currentTime) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(config.start + (config.end - config.start) * eased)

      if (progress < 1) frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [duration, isInView, reduceMotion, value])

  return { ref, count }
}

export default useCountUp
