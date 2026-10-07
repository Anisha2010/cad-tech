import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../../../components/auth/AuthLayout/AuthLayout.jsx'
import { getPasswordResetStatus, requestPasswordReset } from '../../../services/authService.js'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailDeliveryUnavailable, setEmailDeliveryUnavailable] = useState(false)
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(import.meta.env.DEV)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    let active = true
    getPasswordResetStatus().then((response) => {
      if (active) setEmailDeliveryUnavailable(response.data?.data?.configured === false)
    }).catch(() => {}).finally(() => {
      if (active) setIsCheckingDelivery(false)
    })
    return () => { active = false }
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      const response = await requestPasswordReset(normalizedEmail)
      setMessage(emailDeliveryUnavailable
        ? 'Request received. Email delivery is unavailable in this development environment until SMTP is configured.'
        : response.data?.message || 'If an account exists and email delivery is available, instructions will be sent shortly.')
    } catch (requestError) {
      setError(requestError.authDetails?.message || 'Unable to process your request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <section className="auth-form-card forgot-password-card" aria-labelledby="forgot-password-heading">
        <span className="categories-eyebrow">ACCOUNT RECOVERY</span>
        <h2 id="forgot-password-heading">Forgot Password?</h2>
        <p className="auth-form-description">Enter your account email to request a password reset.</p>
        {import.meta.env.DEV && emailDeliveryUnavailable && !message && <div className="auth-notice auth-notice-warning" role="status">Password reset emails are not configured in this development environment. Your request can be submitted, but no email will be sent.</div>}
        {error && <div className="auth-status-error" role="alert">{error}</div>}
        {message && <div className={`auth-notice ${emailDeliveryUnavailable ? 'auth-notice-warning' : 'auth-notice-success'}`} role="status" aria-live="polite">{message}</div>}
        <form onSubmit={submit} noValidate>
          <div className="auth-field">
            <label htmlFor="recovery-email">Email Address <span aria-hidden="true">*</span></label>
            <input id="recovery-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(''); setMessage('') }} autoComplete="email" placeholder="you@example.com" aria-invalid={Boolean(error)} aria-describedby={error ? 'recovery-email-error' : undefined} />
            {error && <span className="auth-field-error" id="recovery-email-error">{error}</span>}
          </div>
          <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting || isCheckingDelivery}>{isSubmitting ? 'Sending...' : isCheckingDelivery ? 'Checking email delivery...' : 'Send reset instructions'}</button>
        </form>
        <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
      </section>
    </AuthLayout>
  )
}

export default ForgotPassword