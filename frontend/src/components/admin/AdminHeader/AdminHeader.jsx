import { ChevronDown, CircleUserRound, LockKeyhole, LogOut, Menu, Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ThemeToggle from '../../common/ThemeToggle/ThemeToggle.jsx'
import useAuth from '../../../context/useAuth.jsx'
import './AdminHeader.css'

const titles = {
  dashboard: 'Admin Dashboard',
  account: 'My Profile',
  profile: 'My Profile',
  'profile/edit': 'Edit Profile',
  'profile/change-password': 'Change Password',
  courses: 'Courses',
  'cad-categories': 'CAD Categories',
  'cad-products': 'CAD Products',
  'cad-services': 'CAD Services',
  'service-requests': 'Service Requests',
  'cad-orders': 'CAD Orders',
  assessments: 'Assessments',
  certificates: 'Certificates',
  'website-content': 'Website Content',
  'site-content': 'Website Content',
  'contact-enquiries': 'Contact Enquiries',
  students: 'Students',
  instructors: 'Instructors',
  enrollments: 'Enrollments',
  payments: 'Payments',
  settings: 'Site Settings'
}

function AdminHeader({ pathname, onMenu, onLogout }) {
  const { user } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRootRef = useRef(null)
  const profileButtonRef = useRef(null)
  const menuRef = useRef(null)
  const segments = pathname.split('/').slice(2)
  const key = segments.slice(0, 2).join('/') || segments[0] || 'dashboard'

  useEffect(() => {
    if (!profileOpen) return undefined
    const closeOutside = (event) => {
      if (!profileRootRef.current?.contains(event.target)) setProfileOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProfileOpen(false)
        profileButtonRef.current?.focus()
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])
      if (!items.length) return
      event.preventDefault()
      const currentIndex = items.indexOf(document.activeElement)
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (currentIndex + 1 + items.length) % items.length : (currentIndex - 1 + items.length) % items.length
      items[nextIndex]?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', handleKeyDown)
    menuRef.current?.querySelector('[role="menuitem"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [profileOpen])

  const closeMenu = () => setProfileOpen(false)
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'A'

  return (
    <header className="admin-header">
      <button className="admin-menu-button" type="button" onClick={onMenu} aria-label="Open admin navigation"><Menu size={21} /></button>
      <div className="admin-header-title"><p className="admin-header-kicker">ADMINISTRATION</p><h1>{titles[key] || titles[segments[0]] || 'Admin Dashboard'}</h1></div>
      <div className="admin-header-actions">
        <ThemeToggle />
        <div className="admin-profile-menu" ref={profileRootRef}>
          <button ref={profileButtonRef} className="admin-identity" type="button" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>
            <span className="admin-identity-avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}</span>
            <span className="admin-identity-copy"><strong>{user?.name || 'Administrator'}</strong><small>Administrator</small></span>
            <ChevronDown className={profileOpen ? 'is-open' : ''} size={16} aria-hidden="true" />
          </button>
          {profileOpen && <div className="admin-profile-popover" role="menu" aria-label="Admin profile" ref={menuRef}>
            <div className="admin-profile-popover-heading"><CircleUserRound size={19} /><span>{user?.email || 'Administrator account'}</span></div>
            <Link role="menuitem" to="/admin/profile" onClick={closeMenu}><CircleUserRound size={17} />My Profile</Link>
            <Link role="menuitem" to="/admin/profile/edit" onClick={closeMenu}><Pencil size={17} />Edit Profile</Link>
            <Link role="menuitem" to="/admin/profile/change-password" onClick={closeMenu}><LockKeyhole size={17} />Change Password</Link>
            <button role="menuitem" type="button" onClick={() => { closeMenu(); onLogout() }}><LogOut size={17} />Logout</button>
          </div>}
        </div>
      </div>
    </header>
  )
}

export default AdminHeader