import { useState } from 'react'
import { Link } from 'react-router-dom'
import useAuth from '../../context/useAuth.jsx'
import { uploadProfileImage } from '../../services/authService.js'
import './AdminProfile.css'

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

function AdminProfileEdit() {
  const { user, updateProfile } = useAuth()
  const profilePath = user?.role === 'instructor' ? '/instructor/profile' : '/admin/profile'
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', avatarUrl: user?.avatarUrl || '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setError('')
    setSuccess('')
  }

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setErrors((current) => ({ ...current, avatarUrl: undefined }))
    setError('')
    setSuccess('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrors((current) => ({ ...current, avatarUrl: 'Choose a JPG, PNG, or WebP image.' }))
      event.target.value = ''
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((current) => ({ ...current, avatarUrl: 'Profile images must be 10 MB or smaller.' }))
      event.target.value = ''
      return
    }

    setUploadingAvatar(true)
    try {
      const result = await uploadProfileImage(file)
      const avatarUrl = result?.image?.url
      if (!avatarUrl) throw new Error('The upload did not return an image URL.')
      await updateProfile({ name: form.name.trim(), email: form.email.trim(), avatarUrl })
      setForm((current) => ({ ...current, avatarUrl }))
      setSuccess('Profile image updated successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.authDetails?.message || requestError.message || 'Unable to upload profile image.')
    } finally {
      setUploadingAvatar(false)
      event.target.value = ''
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (form.name.trim().length < 2 || form.name.trim().length > 100) nextErrors.name = 'Name must be between 2 and 100 characters.'
    if (!validEmail(form.email.trim()) || form.email.trim().length > 254) nextErrors.email = 'Enter a valid email address.'
    if (form.avatarUrl.trim()) {
      try {
        const avatar = new URL(form.avatarUrl.trim())
        if (!['http:', 'https:'].includes(avatar.protocol) || form.avatarUrl.length > 2048) nextErrors.avatarUrl = 'Use a valid HTTP or HTTPS image URL.'
      } catch {
        nextErrors.avatarUrl = 'Use a valid HTTP or HTTPS image URL.'
      }
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    setErrors({})
    setError('')
    setSuccess('')
    try {
      await updateProfile({ name: form.name.trim(), email: form.email.trim(), avatarUrl: form.avatarUrl.trim() || null })
      setSuccess('Profile changes saved successfully.')
    } catch (requestError) {
      setErrors(requestError.authDetails?.fieldErrors || {})
      setError(requestError.authDetails?.message || 'Unable to save profile changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="admin-page admin-profile-page">
      <header className="admin-page-header"><div><p className="admin-kicker">YOUR ACCOUNT</p><h1>Edit Profile</h1><p>Update your personal profile details. Account role is managed separately.</p></div><Link to={profilePath} className="button button-outline">Cancel</Link></header>
      <section className="admin-profile-form-card">
        {error && <p className="admin-profile-feedback is-error" role="alert">{error}</p>}
        {success && <p className="admin-profile-feedback" role="status">{success}</p>}
        <form onSubmit={submit} noValidate>
          <div className="admin-profile-form-grid">
            <div className="admin-profile-field"><label htmlFor="admin-profile-avatar-upload">Choose profile image</label><input id="admin-profile-avatar-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} disabled={uploadingAvatar} aria-describedby={errors.avatarUrl ? 'admin-profile-avatar-upload-error' : undefined} />{uploadingAvatar && <span role="status">Uploading profile image...</span>}{errors.avatarUrl && <span id="admin-profile-avatar-upload-error" className="admin-profile-field-error">{errors.avatarUrl}</span>}</div>
            <Field id="admin-profile-name" label="Name" value={form.name} error={errors.name} onChange={(value) => updateField('name', value)} autoComplete="name" />
            <Field id="admin-profile-email" label="Email" type="email" value={form.email} error={errors.email} onChange={(value) => updateField('email', value)} autoComplete="email" />
            <Field id="admin-profile-avatar" label="Profile image URL" type="url" value={form.avatarUrl} error={errors.avatarUrl} onChange={(value) => updateField('avatarUrl', value)} autoComplete="url" helper="Use a public HTTPS image URL. Leave blank to use your initials." />
            <div className="admin-profile-role-field"><span>Role</span><strong>{user?.role === 'admin' ? 'Administrator' : user?.role}</strong><small>Role changes are not permitted from this page.</small></div>
          </div>
          {form.avatarUrl && <div className="admin-profile-preview"><img src={form.avatarUrl} alt="Profile preview" onError={(event) => { event.currentTarget.hidden = true }} /></div>}
          <div className="admin-profile-form-actions"><Link to={profilePath} className="button button-outline">Cancel</Link><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button></div>
        </form>
      </section>
    </main>
  )
}

function Field({ id, label, value, onChange, error, type = 'text', autoComplete, helper }) {
  return <div className="admin-profile-field"><label htmlFor={id}>{label}</label><input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : helper ? `${id}-help` : undefined} />{error && <span id={`${id}-error`} className="admin-profile-field-error">{error}</span>}{helper && !error && <small id={`${id}-help`}>{helper}</small>}</div>
}

export default AdminProfileEdit
