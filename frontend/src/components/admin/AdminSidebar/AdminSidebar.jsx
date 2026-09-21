import { BarChart3, BookOpen, CreditCard, GraduationCap, Settings, Users, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import './AdminSidebar.css'

const items = [
  ['Dashboard', '/admin/dashboard', BarChart3], ['Courses', '/admin/courses', BookOpen], ['Assessments', '/admin/assessments', BookOpen], ['Students', '/admin/students', GraduationCap],
  ['Instructors', '/admin/instructors', Users], ['Enrollments', '/admin/enrollments', Users], ['Payments', '/admin/payments', CreditCard], ['Settings', '/admin/settings', Settings]
]

function AdminSidebar({ isOpen, onNavigate }) {
  return <><div className={`admin-sidebar-backdrop ${isOpen ? 'is-visible' : ''}`} onClick={onNavigate} aria-hidden="true" /><aside className={`admin-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Admin navigation"><div className="admin-sidebar-brand"><span>CadTech</span><strong>Admin</strong><button type="button" className="admin-close-button" onClick={onNavigate} aria-label="Close admin navigation"><X size={20} /></button></div><nav>{items.map(([label, path, Icon]) => <NavLink key={path} to={path} end={path === '/admin/dashboard'} onClick={onNavigate} className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}><Icon size={18} aria-hidden="true" /><span>{label}</span></NavLink>)}</nav></aside></>
}

export default AdminSidebar