import { useEffect, useState } from 'react'
import { LockKeyhole, UserRound } from 'lucide-react'
import useAuth from '../../context/useAuth.jsx'
import { changePassword, getCurrentUser, uploadProfileImage } from '../../services/authService.js'
import PasswordField from '../../components/auth/PasswordField/PasswordField.jsx'
import './Account.css'

const emptyProfile = { name: '', email: '', phone: '', avatarUrl: '' }

function getUserFromResponse(response) {
  return response?.data?.data?.user ?? response?.data?.user ?? null
}

function validatePassword(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{12,64}$/.test(value) && new TextEncoder().encode(value).length <= 72
    ? ''
    : 'Use 12 to 64 characters with uppercase, lowercase, number, and symbol.'
}

function Account() {
  const { user, updateProfile } = useAuth()
  const [profile, setProfile] = useState(emptyProfile)
  const [role, setRole] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [profileErrors, setProfileErrors] = useState({})
  const [passwordErrors, setPasswordErrors] = useState({})
  const [profileMessage, setProfileMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwords, setPasswords] = useState({ currentPassword: '', password: '', confirmPassword: '' })

  useEffect(() => {
    let active = true
    getCurrentUser().then((response) => {
      const currentUser = getUserFromResponse(response)
      if (active && currentUser) {
        setProfile({ name: currentUser.name || '', email: currentUser.email || '', phone: currentUser.phone || '', avatarUrl: currentUser.avatarUrl || '' })
        setRole(currentUser.role || '')
      }
    }).catch((error) => {
      if (active) setProfileMessage(error.authDetails?.message || 'Unable to load your account details.')
    }).finally(() => {
      if (active) setIsLoading(false)
    })
    return () => { active = false }
  }, [])

  const updateProfileField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }))
    setProfileErrors((current) => ({ ...current, [field]: undefined }))
    setProfileMessage('')
  }

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setProfileMessage('')
    setProfileErrors((current) => ({ ...current, avatarUrl: undefined }))
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProfileErrors((current) => ({ ...current, avatarUrl: 'Choose a JPG, PNG, or WebP image.' }))
      event.target.value = ''
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setProfileErrors((current) => ({ ...current, avatarUrl: 'Profile images must be 10 MB or smaller.' }))
      event.target.value = ''
      return
    }

    setIsUploadingAvatar(true)
    try {
      const result = await uploadProfileImage(file)
      const avatarUrl = result?.image?.url
      if (!avatarUrl) throw new Error('The upload did not return an image URL.')
      await updateProfile({ name: profile.name.trim(), email: profile.email.trim(), phone: profile.phone.trim() || null, avatarUrl })
      setProfile((current) => ({ ...current, avatarUrl }))
      setProfileMessage('Profile image updated successfully.')
    } catch (error) {
      setProfileMessage(error.response?.data?.message || error.authDetails?.message || error.message || 'Unable to upload profile image.')
    } finally {
      setIsUploadingAvatar(false)
      event.target.value = ''
    }
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    const errors = {}
    if (profile.name.trim().length < 2 || profile.name.trim().length > 100) errors.name = 'Name must be between 2 and 100 characters.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) errors.email = 'Enter a valid email address.'
    if (profile.phone && !/^[0-9]{10}$/.test(profile.phone.replace(/\D/g, ''))) errors.phone = 'Enter a valid 10-digit phone number.'
    if (profile.avatarUrl) {
      try {
        const url = new URL(profile.avatarUrl)
        if (!['http:', 'https:'].includes(url.protocol)) errors.avatarUrl = 'Enter a valid image URL.'
      } catch {
        errors.avatarUrl = 'Enter a valid image URL.'
      }
    }
    if (Object.keys(errors).length) {
      setProfileErrors(errors)
      return
    }

    setIsSavingProfile(true)
    setProfileErrors({})
    setProfileMessage('')
    try {
      await updateProfile({ name: profile.name.trim(), email: profile.email.trim(), phone: profile.phone.trim() || null, avatarUrl: profile.avatarUrl.trim() || null })
      setProfileMessage('Profile updated successfully.')
    } catch (error) {
      setProfileErrors(error.authDetails?.fieldErrors || {})
      setProfileMessage(error.authDetails?.message || 'Unable to update your profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const updatePasswordField = (field, value) => {
    setPasswords((current) => ({ ...current, [field]: value }))
    setPasswordErrors((current) => ({ ...current, [field]: undefined }))
    setPasswordMessage('')
  }

  const savePassword = async (event) => {
    event.preventDefault()
    const errors = {}
    if (!passwords.currentPassword) errors.currentPassword = 'Current password is required.'
    const passwordError = validatePassword(passwords.password)
    if (passwordError) errors.password = passwordError
    if (passwords.currentPassword && passwords.password === passwords.currentPassword) errors.password = 'Choose a password different from your current password.'
    if (passwords.confirmPassword !== passwords.password) errors.confirmPassword = 'Passwords do not match.'
    if (Object.keys(errors).length) {
      setPasswordErrors(errors)
      return
    }

    setIsSavingPassword(true)
    setPasswordErrors({})
    setPasswordMessage('')
    try {
      const response = await changePassword(passwords)
      setPasswordMessage(response.data?.message || 'Password changed successfully.')
      setPasswords({ currentPassword: '', password: '', confirmPassword: '' })
    } catch (error) {
      setPasswordErrors(error.authDetails?.fieldErrors || {})
      setPasswordMessage(error.authDetails?.message || 'Unable to change your password.')
    } finally {
      setIsSavingPassword(false)
    }
  }

  if (isLoading) return <div className="account-page" aria-live="polite"><div className="site-container account-loading">Loading account settings...</div></div>

  return (
    <div className="account-page">
      <div className="site-container account-container">
        <header className="account-page-header"><span className="categories-eyebrow">ACCOUNT SETTINGS</span><h1>Profile & security</h1><p>Manage your account details and password.</p></header>
        <section className="account-section" aria-labelledby="profile-section-heading">
          <div className="account-section-heading"><span className="account-section-icon"><UserRound size={20} /></span><div><h2 id="profile-section-heading">Profile information</h2><p>Update your personal details.</p></div></div>
          {profileMessage && <p className={profileErrors.email ? 'account-feedback is-error' : 'account-feedback'} role={profileErrors.email ? 'alert' : 'status'}>{profileMessage}</p>}
          {profile.avatarUrl && <div className="account-avatar-preview"><img src={profile.avatarUrl} alt="Profile image preview" /></div>}
          <form className="account-form-grid" onSubmit={saveProfile} noValidate>
            <div className="account-field"><label htmlFor="account-avatar-upload">Choose profile image</label><input id="account-avatar-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} disabled={isUploadingAvatar} aria-describedby={profileErrors.avatarUrl ? 'account-avatar-upload-error' : undefined} />{isUploadingAvatar && <span role="status">Uploading profile image...</span>}{profileErrors.avatarUrl && <span className="auth-field-error" id="account-avatar-upload-error">{profileErrors.avatarUrl}</span>}</div>
            <Field label="Name" id="account-name" value={profile.name} onChange={(value) => updateProfileField('name', value)} error={profileErrors.name} autoComplete="name" />
            <Field label="Email" id="account-email" type="email" value={profile.email} onChange={(value) => updateProfileField('email', value)} error={profileErrors.email} autoComplete="email" />
            <Field label="Phone" id="account-phone" type="tel" value={profile.phone} onChange={(value) => updateProfileField('phone', value)} error={profileErrors.phone} autoComplete="tel" />
            <Field label="Profile image URL" id="account-avatar" type="url" value={profile.avatarUrl} onChange={(value) => updateProfileField('avatarUrl', value)} error={profileErrors.avatarUrl} autoComplete="url" />
            <div className="account-role-field"><span>Account type</span><strong>{role ? role[0].toUpperCase() + role.slice(1) : user?.role}</strong></div>
            <div className="account-form-actions"><button className="button button-primary" type="submit" disabled={isSavingProfile}>{isSavingProfile ? 'Saving...' : 'Save profile'}</button></div>
          </form>
        </section>

        <section className="account-section" aria-labelledby="password-section-heading">
          <div className="account-section-heading"><span className="account-section-icon"><LockKeyhole size={20} /></span><div><h2 id="password-section-heading">Change password</h2><p>Confirm your current password before choosing a new one.</p></div></div>
          {passwordMessage && <p className={Object.keys(passwordErrors).length ? 'account-feedback is-error' : 'account-feedback'} role={Object.keys(passwordErrors).length ? 'alert' : 'status'}>{passwordMessage}</p>}
          <form className="account-password-form" onSubmit={savePassword} noValidate>
            <PasswordField id="account-current-password" label="Current password" value={passwords.currentPassword} onChange={(event) => updatePasswordField('currentPassword', event.target.value)} error={passwordErrors.currentPassword} autoComplete="current-password" placeholder="Enter your current password" />
            <PasswordField id="account-new-password" label="New password" value={passwords.password} onChange={(event) => updatePasswordField('password', event.target.value)} error={passwordErrors.password} autoComplete="new-password" placeholder="Enter a new password" />
            <PasswordField id="account-confirm-password" label="Confirm new password" value={passwords.confirmPassword} onChange={(event) => updatePasswordField('confirmPassword', event.target.value)} error={passwordErrors.confirmPassword} autoComplete="new-password" placeholder="Re-enter the new password" />
            <button className="button button-primary account-password-submit" type="submit" disabled={isSavingPassword}>{isSavingPassword ? 'Updating...' : 'Change password'}</button>
          </form>
        </section>
      </div>
    </div>
  )
}

function Field({ label, id, value, onChange, error, type = 'text', autoComplete }) {
  return <div className="account-field"><label htmlFor={id}>{label}</label><input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />{error && <span className="auth-field-error" id={`${id}-error`}>{error}</span>}</div>
}

export default Account