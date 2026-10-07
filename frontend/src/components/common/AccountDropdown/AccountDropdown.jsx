import { useEffect, useRef, useState } from 'react'
import { ChevronDown, CircleUserRound, LockKeyhole, LogOut, Pencil } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import LogoutConfirmationDialog from '../LogoutConfirmationDialog/LogoutConfirmationDialog.jsx'
import useAuth from '../../../context/useAuth.jsx'
import './AccountDropdown.css'

const accountRoutes = {
  student: { profile: '/student/account', edit: '/student/account#profile-section-heading', password: '/student/account#password-section-heading' },
  instructor: { profile: '/instructor/profile', edit: '/instructor/profile/edit', password: '/instructor/profile/change-password' }
}

function AccountDropdown({ role, name, avatarUrl, onLogout }) {
  const [open, setOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const rootRef = useRef(null)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const routes = accountRoutes[role]
  const hasLogoutCallback = typeof onLogout === 'function'
  const initials = name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || role[0].toUpperCase()

  useEffect(() => {
    if (!open) return undefined
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeEscape = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [open])

  if (!routes) return null

  const close = () => setOpen(false)
  const requestLogout = () => {
    close()
    if (hasLogoutCallback) {
      onLogout()
      return
    }
    setLogoutOpen(true)
  }
  const confirmLogout = async () => {
    setLogoutOpen(false)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error(`${role} logout failed`, error)
    }
  }

  return (
    <>
      <div className="account-dropdown" ref={rootRef}>
        <button type="button" className="account-dropdown-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {avatarUrl ? <img className="account-dropdown-avatar" src={avatarUrl} alt="" /> : <span className="account-dropdown-avatar account-dropdown-initials">{initials}</span>}
          <span className="account-dropdown-name">{name || role}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {open && <div className="account-dropdown-menu" role="menu" aria-label="Account">
          <Link role="menuitem" to={routes.profile} onClick={close}><CircleUserRound size={16} />My Profile</Link>
          <Link role="menuitem" to={routes.edit} onClick={close}><Pencil size={16} />Edit Profile</Link>
          <Link role="menuitem" to={routes.password} onClick={close}><LockKeyhole size={16} />Change Password</Link>
          <button role="menuitem" type="button" onClick={requestLogout}><LogOut size={16} />Logout</button>
        </div>}
      </div>
      {!hasLogoutCallback && <LogoutConfirmationDialog open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={confirmLogout} />}
    </>
  )
}

export default AccountDropdown