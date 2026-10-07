import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthLayout from '../../../components/auth/AuthLayout/AuthLayout.jsx'
import PasswordField from '../../../components/auth/PasswordField/PasswordField.jsx'
import { resetPassword, validatePasswordResetToken } from '../../../services/authService.js'

function validatePassword(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{12,64}$/.test(value) && new TextEncoder().encode(value).length <= 72
    ? ''
    : 'Use 12 to 64 characters with uppercase, lowercase, number, and symbol.'
}

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tokenValidation, setTokenValidation] = useState({ token, status: token ? 'checking' : 'invalid' })
  const [isResetComplete, setIsResetComplete] = useState(false)

  useEffect(() => {
    if (!token) return undefined
    let active = true
    validatePasswordResetToken(token).then((response) => {
      if (active) setTokenValidation({ token, status: response.data?.data?.valid ? 'valid' : 'invalid' })
    }).catch(() => {
      if (active) setTokenValidation({ token, status: 'invalid' })
    })
    return () => { active = false }
  }, [token])

  const visibleTokenState = !token ? 'invalid' : tokenValidation.token === token ? tokenValidation.status : 'checking'

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setMessage('')
  }

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!token) nextErrors.token = 'This reset link is invalid or has expired.'
    const passwordError = validatePassword(form.password)
    if (passwordError) nextErrors.password = passwordError
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Passwords do not match.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})
    try {
      const response = await resetPassword({ token, password: form.password, confirmPassword: form.confirmPassword })
      setMessage(response.data?.message || 'Password reset successful. You can now sign in.')
      setForm({ password: '', confirmPassword: '' })
      setIsResetComplete(true)
    } catch (requestError) {
      setErrors(requestError.authDetails?.fieldErrors || {})
      setMessage(requestError.authDetails?.message || 'This reset link is invalid or has expired.')
      if (requestError.authDetails?.fieldErrors?.token) setTokenValidation({ token, status: 'invalid' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <section className="auth-form-card account-auth-card" aria-labelledby="reset-password-heading">
        <span className="categories-eyebrow">ACCOUNT RECOVERY</span>
        <h2 id="reset-password-heading">Set a new password</h2>
        <p className="auth-form-description">Choose a strong password for your CadTech account.</p>
        {visibleTokenState === 'checking' && <div className="auth-notice" role="status">Checking reset link...</div>}
        {visibleTokenState === 'invalid' && <div className="auth-status-error" role="alert">This reset link is invalid, expired, or already used. Request a new link to continue.</div>}
        {message && <div className={errors.token ? 'auth-status-error' : 'auth-notice'} role={errors.token ? 'alert' : 'status'} aria-live="polite">{message}</div>}
        {isResetComplete && <Link className="button button-primary auth-submit" to="/login">Go to Login</Link>}
        {visibleTokenState === 'valid' && !isResetComplete && <form onSubmit={submit} noValidate>
          <PasswordField id="reset-password" label="New password" value={form.password} onChange={(event) => update('password', event.target.value)} error={errors.password} autoComplete="new-password" placeholder="Enter a new password" />
          <PasswordField id="reset-confirm-password" label="Confirm new password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} error={errors.confirmPassword} autoComplete="new-password" placeholder="Re-enter the new password" />
          <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting || !token}>{isSubmitting ? 'Updating...' : 'Reset password'}</button>
        </form>}
        <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
      </section>
    </AuthLayout>
  )
}

export default ResetPassword