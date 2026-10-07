import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthLayout from '../../../components/auth/AuthLayout/AuthLayout.jsx'
import { resendVerificationEmail } from '../../../services/authService.js'

const DEFAULT_COOLDOWN_SECONDS = 60

function CheckEmail() {
  const location = useLocation()
  const initialEmail = typeof location.state?.email === 'string' ? location.state.email : ''
  const [email, setEmail] = useState(initialEmail)
  const [cooldown, setCooldown] = useState(initialEmail ? (location.state?.resendAfterSeconds || DEFAULT_COOLDOWN_SECONDS) : 0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!cooldown) return undefined
    const timer = window.setTimeout(() => setCooldown((remaining) => Math.max(0, remaining - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const resend = async (event) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter the email address used to create your account.')
      return
    }
    setIsSubmitting(true)
    setError('')
    setStatus('')
    try {
      const response = await resendVerificationEmail(email.trim())
      const seconds = response.data?.data?.resendAfterSeconds || DEFAULT_COOLDOWN_SECONDS
      setCooldown(seconds)
      setStatus(response.data?.message || 'If this account needs verification, an email will be sent shortly.')
    } catch (requestError) {
      setError(requestError.authDetails?.message || 'Unable to send a verification email right now. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <AuthLayout><section className="auth-form-card" aria-labelledby="check-email-heading">
    <span className="categories-eyebrow">ACCOUNT VERIFICATION</span>
    <h2 id="check-email-heading">Check your email</h2>
    <p className="auth-form-description">Your account is almost ready. Open the verification link we sent to {initialEmail ? <strong>{initialEmail}</strong> : 'your email address'} to finish creating your CadTech account.</p>
    {status && <div className="auth-notice" role="status" aria-live="polite">{status}</div>}
    {error && <div className="auth-status-error" role="alert">{error}</div>}
    <form onSubmit={resend} noValidate>
      {!initialEmail && <div className="auth-field"><label htmlFor="verification-email">Email address <span aria-hidden="true">*</span></label><input id="verification-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(''); setStatus('') }} autoComplete="email" placeholder="you@example.com" /></div>}
      <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting || cooldown > 0}>{isSubmitting ? 'Sending...' : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}</button>
    </form>
    <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
  </section></AuthLayout>
}

export default CheckEmail
