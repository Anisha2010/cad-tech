import { Box, Cpu, Layers3, Ruler, ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import './AuthLayout.css'

function AuthLayout({ children }) {
  return <main className="auth-page"><div className="auth-shell"><aside className="auth-brand-panel surface-dark"><Link className="auth-brand" to="/"><span className="auth-brand-icon"><Cpu size={20} /></span>CadTech <strong>Solution</strong></Link><div className="auth-brand-copy"><span className="categories-eyebrow">CADTECH SOLUTION</span><h1>Learn, Design, and Build with Confidence</h1><p>Access practical CAD training, organized design resources, and engineering tools.</p></div><div className="auth-visual" aria-hidden="true"><div className="auth-visual-grid" /><div className="auth-visual-card"><div><span>WORKSPACE / 01</span><ScanLine size={16} /></div><div className="auth-orbit"><Box size={78} /><span /></div><footer><Ruler size={15} /> PRECISION LEARNING</footer></div><span className="auth-visual-label auth-label-one"><Layers3 size={14} /> DESIGN</span><span className="auth-visual-label auth-label-two">PRACTICE</span></div></aside><section className="auth-form-panel">{children}</section></div></main>
}

export default AuthLayout