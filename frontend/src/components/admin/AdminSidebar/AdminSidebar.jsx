import { Award, BarChart3, BookOpen, Box, CreditCard, GraduationCap, Settings, UserRound, Users, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import './AdminSidebar.css'

const groups = [
  { label: '', items: [['Dashboard', '/admin/dashboard', BarChart3]] },
  { label: 'Learning', items: [['Courses', '/admin/courses', BookOpen], ['Assessments', '/admin/assessments', BookOpen], ['Certificates', '/admin/certificates', Award]] },
  { label: 'CAD', items: [['CAD Categories', '/admin/cad-categories', Box], ['CAD Products', '/admin/cad-products', Box], ['CAD Services', '/admin/cad-services', Box], ['Service Requests', '/admin/service-requests', Users], ['CAD Orders', '/admin/cad-orders', CreditCard]] },
  { label: 'Users', items: [['Students', '/admin/students', GraduationCap], ['Instructors', '/admin/instructors', Users], ['Enrollments', '/admin/enrollments', Users], ['Payments', '/admin/payments', CreditCard]] },
  { label: 'Website', items: [['Website Content', '/admin/website-content', Settings], ['Contact Enquiries', '/admin/contact-enquiries', Users], ['Site Settings', '/admin/settings', Settings]] }
]

function AdminSidebar({ isOpen, onNavigate }) {
  return <><div className={`admin-sidebar-backdrop ${isOpen ? 'is-visible' : ''}`} onClick={onNavigate} aria-hidden="true" /><aside className={`admin-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Admin navigation"><div className="admin-sidebar-brand"><span>CadTech</span><strong>Admin</strong><button type="button" className="admin-close-button" onClick={onNavigate} aria-label="Close admin navigation"><X size={20} /></button></div><nav>{groups.map((group) => <section className="admin-nav-group" key={group.label || 'overview'}>{group.label && <h2>{group.label}</h2>}{group.items.map(([label, path, Icon]) => <NavLink key={path} to={path} end={path === '/admin/dashboard'} onClick={onNavigate} className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}><Icon size={18} aria-hidden="true" /><span>{label}</span></NavLink>)}</section>)}</nav></aside></>
}

export default AdminSidebar