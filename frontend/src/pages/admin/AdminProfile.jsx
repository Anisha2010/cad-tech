import { Link } from 'react-router-dom'
import { LockKeyhole, Pencil, UserRound } from 'lucide-react'
import useAuth from '../../context/useAuth.jsx'
import './AdminProfile.css'

const formatRole = (role = '') => role ? `${role[0].toUpperCase()}${role.slice(1)}` : 'Administrator'

function AdminProfile() {
  const { user, isLoading } = useAuth()
  const profileBase = user?.role === 'instructor' ? '/instructor/profile' : '/admin/profile'

  if (isLoading) return <main className="admin-page admin-profile-page"><p className="admin-state" aria-live="polite">Loading profile...</p></main>

  return (
    <main className="admin-page admin-profile-page">
      <header className="admin-page-header"><div><p className="admin-kicker">YOUR ACCOUNT</p><h1>My Profile</h1><p>Personal account details and security controls.</p></div></header>
      <section className="admin-profile-card">
        <div className="admin-profile-avatar">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <UserRound size={28} aria-hidden="true" />}</div>
        <div className="admin-profile-summary"><h2>{user?.name || 'Administrator'}</h2><p>{user?.email || ''}</p><span>{formatRole(user?.role)}</span></div>
        <div className="admin-profile-actions"><Link to={`${profileBase}/edit`} className="button button-primary"><Pencil size={16} /> Edit Profile</Link><Link to={`${profileBase}/change-password`} className="button button-outline"><LockKeyhole size={16} /> Change Password</Link></div>
      </section>
      <section className="admin-profile-detail-card"><h2>Profile information</h2><dl><div><dt>Name</dt><dd>{user?.name || '-'}</dd></div><div><dt>Email</dt><dd>{user?.email || '-'}</dd></div><div><dt>Account role</dt><dd>{formatRole(user?.role)}</dd></div></dl><p>Your role is managed by system administrators and cannot be changed from your profile.</p></section>
    </main>
  )
}

export default AdminProfile
