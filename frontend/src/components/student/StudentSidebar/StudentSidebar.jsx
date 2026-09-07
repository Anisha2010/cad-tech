import { BookOpen, Box, LayoutDashboard, LogOut, MessageCircle, ShoppingBag, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import useAuth from '../../../context/useAuth.jsx'
import './StudentSidebar.css'

const navItems = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/my-courses', label: 'My Courses', icon: ShoppingBag },
  { to: '/courses', label: 'Browse Courses', icon: BookOpen },
  { to: '/cad-models', label: 'Explore CAD Models', icon: Box },
  { to: '/contact', label: 'Contact Support', icon: MessageCircle },
]

function StudentSidebar({ isOpen, onClose }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Student sidebar logout failed', error)
    } finally {
      onClose?.()
      navigate('/login', { replace: true })
    }
  }

  return (
    <aside className={`student-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Student portal navigation">
      <div className="student-sidebar-header">
        <div className="student-brand" aria-label="CadTech Solution">C</div>
        <div>
          <p className="student-brand-name">CadTech Solution</p>
          <span className="student-brand-label">Student Portal</span>
        </div>
        <button type="button" className="sidebar-close" aria-label="Close navigation drawer" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <nav className="student-nav" aria-label="Student dashboard navigation">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/student/dashboard'}
            className={({ isActive }) => `student-nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
            aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="student-sidebar-footer">
        <button type="button" className="student-logout" onClick={handleLogout}>
          <LogOut size={18} aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

export default StudentSidebar
