import { Box, Globe2, ShieldCheck, Users } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import './Stats.css'

const statistics = [
  { value: '25K+', label: 'Happy Users', icon: Users },
  { value: '15K+', label: 'CAD Models', icon: Box },
  { value: '7+', label: 'Years of Trust', icon: ShieldCheck },
  { value: '120+', label: 'Countries Served', icon: Globe2 },
]

function Stats() {
  const reduceMotion = useReducedMotion()
  return (
    <section className="stats-section" aria-label="CadTech Solution statistics">
      <motion.div className="site-container" initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.5 }}>
        <div className="stats-card">
          {statistics.map(({ value, label, icon: Icon }) => (
            <div className="stat-item" key={label}>
              <div className="stat-icon"><Icon size={22} /></div>
              <div><strong>{value}</strong><span>{label}</span></div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

export default Stats