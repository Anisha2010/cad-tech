import { Award, BookOpen, Box, ClipboardList, Download, LayoutDashboard, LogOut, MessageCircle, Settings, ShoppingBag, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import LogoutConfirmationDialog from '../../common/LogoutConfirmationDialog/LogoutConfirmationDialog.jsx'
import useAuth from '../../../context/useAuth.jsx'
import './StudentSidebar.css'

const navItems = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/my-courses', label: 'My Courses', icon: ShoppingBag },
  { to: '/student/quiz-history', label: 'Quiz History', icon: ClipboardList },
  { to: '/student/downloads', label: 'My Downloads', icon: Download },
  { to: '/student/service-requests', label: 'My Service Requests', icon: MessageCircle },
  { to: '/student/certificates', label: 'My Certificates', icon: Award },
  { to: '/student/account', label: 'Account settings', icon: Settings },
  { to: '/courses', label: 'Browse Courses', icon: BookOpen },
  { to: '/cad-models', label: 'Explore CAD Models', icon: Box },
  { to: '/contact', label: 'Contact Support', icon: MessageCircle },
]

function StudentSidebar({ isOpen, onClose, onRequestLogout }) {
  const [logoutOpen, setLogoutOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const hasLogoutCallback = typeof onRequestLogout === 'function'

  const requestLogout = () => {
    onClose?.()
    if (hasLogoutCallback) {
      onRequestLogout()
      return
    }
    setLogoutOpen(true)
  }

  const confirmLogout = async () => {
    setLogoutOpen(false)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Student logout failed', error)
    }
  }

  return (
    <>
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
          <button type="button" className="student-logout" onClick={requestLogout}>
            <LogOut size={18} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      {!hasLogoutCallback && <LogoutConfirmationDialog open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={confirmLogout} />}
    </>
  )
}

export default StudentSidebar
