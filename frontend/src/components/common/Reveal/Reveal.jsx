import { motion, useReducedMotion } from 'framer-motion'

function Reveal({ children, className, delay = 0, direction = 'up', as: Component = motion.div }) {
  const reduceMotion = useReducedMotion()
  const initial = reduceMotion ? undefined : {
    up: { opacity: 0, y: 30 },
    left: { opacity: 0, x: -30 },
    right: { opacity: 0, x: 30 }
  }[direction] || { opacity: 0, y: 30 }

  const visible = reduceMotion ? undefined : { opacity: 1, x: 0, y: 0 }

  return (
    <Component
      className={className}
      initial={initial}
      whileInView={visible}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
    >
      {children}
    </Component>
  )
}

export default Reveal
