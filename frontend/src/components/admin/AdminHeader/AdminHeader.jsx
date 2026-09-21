import { LogOut, Menu } from 'lucide-react'
import ThemeToggle from '../../common/ThemeToggle/ThemeToggle.jsx'
import useAuth from '../../../context/useAuth.jsx'
import './AdminHeader.css'

const titles = { dashboard: 'Admin Dashboard', courses: 'Courses', students: 'Students', instructors: 'Instructors', enrollments: 'Enrollments', payments: 'Payments', settings: 'Settings' }

function AdminHeader({ pathname, onMenu, onLogout }) {
  const { user } = useAuth()
  const key = pathname.split('/')[2] || 'dashboard'
  return <header className="admin-header"><button className="admin-menu-button" type="button" onClick={onMenu} aria-label="Open admin navigation"><Menu size={21} /></button><div><p className="admin-header-kicker">ADMINISTRATION</p><h1>{titles[key] || 'Admin Dashboard'}</h1></div><div className="admin-header-actions"><ThemeToggle /><div className="admin-identity"><strong>{user?.name || 'Administrator'}</strong><span>Administrator</span></div><button className="admin-logout" type="button" onClick={onLogout}><LogOut size={17} /> Logout</button></div></header>
}

export default AdminHeader