import { Menu, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import ThemeToggle from '../../components/common/ThemeToggle/ThemeToggle.jsx'
import InstructorSidebar from '../../components/instructor/InstructorSidebar/InstructorSidebar.jsx'
import AccountDropdown from '../../components/common/AccountDropdown/AccountDropdown.jsx'
import LogoutConfirmationDialog from '../../components/common/LogoutConfirmationDialog/LogoutConfirmationDialog.jsx'
import useAuth from '../../context/useAuth.jsx'
import useSidebarOverlay from '../../hooks/useSidebarOverlay.js'
import './InstructorLayout.css'

function InstructorLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const asideRef = useRef(null)

  useSidebarOverlay(isSidebarOpen, () => setSidebarOpen(false), asideRef)

  const confirmLogout = async () => {
    setLogoutOpen(false)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Instructor logout failed', error)
    }
  }

  return (
    <div className="instructor-shell">
      <InstructorSidebar asideRef={asideRef} isOpen={isSidebarOpen} onNavigate={() => setSidebarOpen(false)} onRequestLogout={() => setLogoutOpen(true)} />

      <div className="instructor-main">
        <header className="instructor-topbar">
          <div className="instructor-topbar-left">
            <button
              type="button"
              className="instructor-menu-button"
              aria-label={isSidebarOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
              aria-controls="instructor-sidebar-nav"
              aria-expanded={isSidebarOpen}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              {isSidebarOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
            <p className="instructor-topbar-title">CADTECH Instructor Portal</p>
          </div>

          <div className="instructor-topbar-actions">
            <ThemeToggle />
            <AccountDropdown role="instructor" name={user?.name || 'Instructor'} avatarUrl={user?.avatarUrl} onLogout={() => setLogoutOpen(true)} />
          </div>
        </header>

        <main className="instructor-content">
          <Outlet />
        </main>
      </div>
      <LogoutConfirmationDialog open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={confirmLogout} />
    </div>
  )
}

export default InstructorLayout
