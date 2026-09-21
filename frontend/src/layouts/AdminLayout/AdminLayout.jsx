import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import useAuth from '../../context/useAuth.jsx'
import AdminSidebar from '../../components/admin/AdminSidebar/AdminSidebar.jsx'
import AdminHeader from '../../components/admin/AdminHeader/AdminHeader.jsx'
import './AdminLayout.css'

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }

  return <div className="admin-shell"><AdminSidebar isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} /><div className="admin-main"><AdminHeader pathname={location.pathname} onMenu={() => setSidebarOpen((open) => !open)} onLogout={handleLogout} /><main className="admin-content"><Outlet /></main></div></div>
}

export default AdminLayout