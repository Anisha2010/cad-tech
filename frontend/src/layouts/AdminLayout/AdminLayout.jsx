import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import useAuth from '../../context/useAuth.jsx'
import AdminSidebar from '../../components/admin/AdminSidebar/AdminSidebar.jsx'
import AdminHeader from '../../components/admin/AdminHeader/AdminHeader.jsx'
import LogoutConfirmationDialog from '../../components/common/LogoutConfirmationDialog/LogoutConfirmationDialog.jsx'
import useSidebarOverlay from '../../hooks/useSidebarOverlay.js'
import './AdminLayout.css'

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const asideRef = useRef(null)

  useSidebarOverlay(sidebarOpen, () => setSidebarOpen(false), asideRef)

  const confirmLogout = async () => {
    setLogoutOpen(false)
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }

  return <><div className="admin-shell"><AdminSidebar asideRef={asideRef} isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} /><div className="admin-main"><AdminHeader pathname={location.pathname} isOpen={sidebarOpen} onMenu={() => setSidebarOpen((open) => !open)} onLogout={() => setLogoutOpen(true)} /><main className="admin-content"><Outlet /></main></div></div><LogoutConfirmationDialog open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={confirmLogout} /></>
}

export default AdminLayout
