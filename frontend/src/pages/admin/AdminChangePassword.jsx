import { useState } from 'react'
import { Link } from 'react-router-dom'
import PasswordField from '../../components/auth/PasswordField/PasswordField.jsx'
import { changePassword } from '../../services/authService.js'
import useAuth from '../../context/useAuth.jsx'
import './AdminProfile.css'

const validatePassword = (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{12,64}$/.test(value) && new TextEncoder().encode(value).length <= 72
  ? ''
  : 'Use 12 to 64 characters with uppercase, lowercase, number, and symbol.'

function AdminChangePassword() {
  const { user } = useAuth()
  const profilePath = user?.role === 'instructor' ? '/instructor/profile' : '/admin/profile'
  const [form, setForm] = useState({ currentPassword: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setError('')
    setSuccess('')
  }

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.currentPassword) nextErrors.currentPassword = 'Current password is required.'
    const passwordError = validatePassword(form.password)
    if (passwordError) nextErrors.password = passwordError
    if (form.password && form.password === form.currentPassword) nextErrors.password = 'Choose a password different from your current password.'
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Passwords do not match.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    setErrors({})
    setError('')
    setSuccess('')
    try {
      await changePassword(form)
      setForm({ currentPassword: '', password: '', confirmPassword: '' })
      setSuccess('Password changed. Other active sessions have been revoked.')
    } catch (requestError) {
      setErrors(requestError.authDetails?.fieldErrors || {})
      setError(requestError.authDetails?.message || 'Unable to change password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="admin-page admin-profile-page">
      <header className="admin-page-header"><div><p className="admin-kicker">ACCOUNT SECURITY</p><h1>Change Password</h1><p>Verify your current password, then choose a new password for this account.</p></div><Link to={profilePath} className="button button-outline">Back to profile</Link></header>
      <section className="admin-profile-form-card admin-password-card">
        {error && <p className="admin-profile-feedback is-error" role="alert">{error}</p>}
        {success && <p className="admin-profile-feedback" role="status">{success}</p>}
        <form onSubmit={submit} noValidate>
          <PasswordField id="admin-current-password" label="Current Password" value={form.currentPassword} onChange={(event) => update('currentPassword', event.target.value)} error={errors.currentPassword} autoComplete="current-password" />
          <PasswordField id="admin-new-password" label="New Password" value={form.password} onChange={(event) => update('password', event.target.value)} error={errors.password} autoComplete="new-password" />
          <PasswordField id="admin-confirm-password" label="Confirm New Password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} error={errors.confirmPassword} autoComplete="new-password" />
          <p className="admin-password-rule">12–64 characters; include uppercase and lowercase letters, a number, and a symbol.</p>
          <div className="admin-profile-form-actions"><Link to={profilePath} className="button button-outline">Cancel</Link><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Updating...' : 'Change Password'}</button></div>
        </form>
      </section>
    </main>
  )
}

export default AdminChangePassword
