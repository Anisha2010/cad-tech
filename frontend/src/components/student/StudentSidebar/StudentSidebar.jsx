import { Award, BookOpen, Box, ChevronLeft, ChevronRight, ClipboardList, Download, LayoutDashboard, LogOut, MessageCircle, Settings, ShoppingBag, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import LogoutConfirmationDialog from '../../common/LogoutConfirmationDialog/LogoutConfirmationDialog.jsx'
import useAuth from '../../../context/useAuth.jsx'
import useSidebarOverlay from '../../../hooks/useSidebarOverlay.js'
import useCollapsedSidebar from '../../../hooks/useCollapsedSidebar.js'
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
  const asideRef = useRef(null)
  const [collapsed, toggleCollapsed] = useCollapsedSidebar('cadtech:student-sidebar-collapsed')
  const hasLogoutCallback = typeof onRequestLogout === 'function'

  useSidebarOverlay(isOpen, onClose, asideRef)

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
      <div className={`student-sidebar-backdrop ${isOpen ? 'is-visible' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside ref={asideRef} className={`student-sidebar ${isOpen ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`} aria-label="Student portal navigation" id="student-sidebar-nav">
        <div className="student-sidebar-header">
          <button
            type="button"
            className="student-brand"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand student sidebar' : 'Collapse student sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <img src="/favicon.jpg" alt="" />
            <span className="student-brand-chevron" aria-hidden="true">{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</span>
          </button>
          <div className="student-brand-copy">
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
