import { Menu } from 'lucide-react'
import ThemeToggle from '../../common/ThemeToggle/ThemeToggle.jsx'
import AccountDropdown from '../../common/AccountDropdown/AccountDropdown.jsx'
import useAuth from '../../../context/useAuth.jsx'
import './StudentTopbar.css'

function StudentTopbar({ onMenuToggle, isSidebarOpen, pageTitle = 'Student Dashboard', onRequestLogout }) {
  const { user } = useAuth()

  const avatarUrl = user?.avatarUrl || user?.avatar || user?.image || ''
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
        <h1 className="student-page-title">{pageTitle}</h1>
      </div>

      <div className="student-topbar-actions">
        <ThemeToggle />
        <AccountDropdown role="student" name={displayName} avatarUrl={avatarUrl} onLogout={onRequestLogout} />
      </div>
    </header>
  )
}

export default StudentTopbar
