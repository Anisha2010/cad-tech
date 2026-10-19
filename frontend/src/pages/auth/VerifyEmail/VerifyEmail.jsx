import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../../../components/auth/AuthLayout/AuthLayout.jsx'
import { resendVerificationEmail, verifyEmail } from '../../../services/authService.js'
import { isValidVerificationToken, verifyEmailOnce } from '../../../utils/emailVerification.js'

function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [verificationResult, setVerificationResult] = useState({
    token,
    state: token && isValidVerificationToken(token) ? 'checking' : 'invalid',
    message: ''
  })
  const isCurrentResult = !token || verificationResult.token === token
  const state = isCurrentResult
    ? verificationResult.state
    : isValidVerificationToken(token) ? 'checking' : 'invalid'
  const verificationMessage = isCurrentResult ? verificationResult.message : ''
  const [email, setEmail] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [status, setStatus] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (!cooldown) return undefined
    const timer = window.setTimeout(() => setCooldown((remaining) => Math.max(0, remaining - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    if (!token) return undefined
    let active = true
    const finishVerification = (nextState, message = '') => {
      if (!active) return
      setVerificationResult({ token, state: nextState, message })
      navigate('/verify-email', { replace: true })
    }

    if (!isValidVerificationToken(token)) {
      navigate('/verify-email', { replace: true })
      return () => { active = false }
    }

    verifyEmailOnce(token, verifyEmail).then(() => {
      finishVerification('success')
    }).catch((error) => {
      const message = error.response?.status === 400
        ? error.response?.data?.message || 'This link is invalid, expired, or already used.'
        : 'We could not confirm your email right now. Check your connection and request another verification email if needed.'
      finishVerification('invalid', `${message} You can request another verification email.`)
    })
    return () => { active = false }
  }, [token, navigate])

  const resend = async (event) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus('Enter the email address used to create your account.')
      return
    }
    setIsResending(true)
    setStatus('')
    try {
      const response = await resendVerificationEmail(email.trim())
      setCooldown(response.data?.data?.resendAfterSeconds || 60)
      setStatus(response.data?.message || 'If this account needs verification, an email will be sent shortly.')
    } catch (error) {
      setStatus(error.authDetails?.message || 'Unable to resend the verification email right now.')
    } finally {
      setIsResending(false)
    }
  }

  return <AuthLayout><section className="auth-form-card" aria-labelledby="verify-email-heading">
    <span className="categories-eyebrow">ACCOUNT VERIFICATION</span>
    <h2 id="verify-email-heading">{state === 'success' ? 'Email verified' : state === 'checking' ? 'Verifying your email' : 'Verification link unavailable'}</h2>
    {state === 'checking' && <p className="auth-form-description" role="status">Please wait while we confirm your email address.</p>}
    {state === 'success' && <><p className="auth-form-description">Your email address is verified. You can now sign in to your CadTech account.</p><Link className="button button-primary auth-submit" to="/login">Go to sign in</Link></>}
    {state === 'invalid' && <>
      <p className="auth-form-description">{verificationMessage || (token ? 'This link is invalid, expired, or already used. You can request another verification email.' : 'This verification link is missing or malformed. You can request another verification email.')}</p>
      {status && <div className="auth-notice" role="status" aria-live="polite">{status}</div>}
      <form onSubmit={resend} noValidate>
        <div className="auth-field"><label htmlFor="resend-verification-email">Account email <span aria-hidden="true">*</span></label><input id="resend-verification-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setStatus('') }} autoComplete="email" placeholder="you@example.com" /></div>
        <button className="button button-primary auth-submit" type="submit" disabled={isResending || cooldown > 0}>{isResending ? 'Sending...' : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}</button>
      </form>
      <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
    </>}
  </section></AuthLayout>
}

export default VerifyEmail
