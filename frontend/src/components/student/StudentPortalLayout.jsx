import { useState } from 'react'
import StudentSidebar from './StudentSidebar/StudentSidebar.jsx'
import StudentTopbar from './StudentTopbar/StudentTopbar.jsx'
import LogoutConfirmationDialog from '../common/LogoutConfirmationDialog/LogoutConfirmationDialog.jsx'
import useAuth from '../../context/useAuth.jsx'
import { useNavigate } from 'react-router-dom'

function StudentPortalLayout({ children, pageTitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

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
    <div className="student-dashboard-shell">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onRequestLogout={() => setLogoutOpen(true)} />
      <div className="student-dashboard-main">
        <StudentTopbar onMenuToggle={() => setSidebarOpen((open) => !open)} isSidebarOpen={sidebarOpen} pageTitle={pageTitle} onRequestLogout={() => setLogoutOpen(true)} />
        {children}
      </div>
      <LogoutConfirmationDialog open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={confirmLogout} />
    </div>
  )
}

export default StudentPortalLayout
