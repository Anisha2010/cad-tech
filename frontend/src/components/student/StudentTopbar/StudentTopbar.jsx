import { Menu, LogOut, PanelRightOpen } from 'lucide-react'
import ThemeToggle from '../../common/ThemeToggle/ThemeToggle.jsx'
import useAuth from '../../../context/useAuth.jsx'
import { useNavigate } from 'react-router-dom'
import './StudentTopbar.css'

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'U'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'U'
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}

function StudentTopbar({ onMenuToggle, isSidebarOpen }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Student topbar logout failed', error)
    }
  }

  const avatarUrl = user?.avatar || user?.image || ''
  const displayName = user?.name || 'Student'

  return (
    <header className="student-topbar">
      <div className="student-topbar-left">
        <button
          type="button"
          className="student-menu-button"
          aria-label={isSidebarOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
          onClick={onMenuToggle}
        >
          <Menu size={18} aria-hidden="true" />
        </button>
        <h1 className="student-page-title">Student Dashboard</h1>
      </div>

      <div className="student-topbar-actions">
        <ThemeToggle />
        <div className="student-user-menu" aria-label="User menu">
          {avatarUrl ? (
            <img className="student-user-avatar" src={avatarUrl} alt={`${displayName} avatar`} loading="lazy" />
          ) : (
            <span className="student-user-avatar student-user-initials" aria-label={`${displayName} profile initials`}>
              {getInitials(displayName)}
            </span>
          )}
          <span className="student-user-name">{displayName}</span>
          <div className="student-user-dropdown">
            <button type="button" className="student-dropdown-link" onClick={() => window.location.assign('/student/dashboard')}>
              <PanelRightOpen size={14} aria-hidden="true" />
              Dashboard
            </button>
            <button type="button" className="student-dropdown-link danger" onClick={handleLogout}>
              <LogOut size={14} aria-hidden="true" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default StudentTopbar
