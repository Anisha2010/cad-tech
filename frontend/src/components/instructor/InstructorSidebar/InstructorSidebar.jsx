import { BookOpen, Compass, LogOut, MessageSquareText, LayoutDashboard, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import useAuth from '../../../context/useAuth.jsx'
import './InstructorSidebar.css'

const navigationItems = [
  { label: 'Dashboard', to: '/instructor/dashboard', Icon: LayoutDashboard },
  { label: 'My Courses', to: '/instructor/courses', Icon: BookOpen },
  { label: 'Browse Courses', to: '/courses', Icon: Compass },
  { label: 'Contact Support', to: '/contact', Icon: MessageSquareText }
]

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'I'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'I'
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}

function InstructorSidebar({ isOpen, onNavigate }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      onNavigate?.()
    }
  }

  return (
    <>
      <div
        className={`instructor-sidebar-backdrop ${isOpen ? 'is-visible' : ''}`}
        onClick={onNavigate}
        aria-hidden="true"
      />
      <aside className={`instructor-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Instructor navigation" id="instructor-sidebar-nav">
        <div className="instructor-sidebar-header">
          <div className="instructor-brand-wrap" aria-label="CadTech Brand">
            <span className="instructor-brand-mark">C</span>
            <div>
              <span className="instructor-brand-name">CadTech</span>
              <strong>INSTRUCTOR PORTAL</strong>
            </div>
          </div>
          <button type="button" className="instructor-close-button" onClick={onNavigate} aria-label="Close instructor navigation">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <nav className="instructor-sidebar-nav" aria-label="Instructor portal navigation">
          {navigationItems.map(({ label, to, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/instructor/dashboard'}
              onClick={onNavigate}
              className={({ isActive }) => `instructor-nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button type="button" className="instructor-sidebar-logout" onClick={handleLogout}>
          <LogOut size={17} aria-hidden="true" />
          Logout
        </button>
      </aside>
    </>
  )
}

export default InstructorSidebar
