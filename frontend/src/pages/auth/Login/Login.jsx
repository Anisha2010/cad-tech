import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../../../components/auth/AuthLayout/AuthLayout.jsx'
import PasswordField from '../../../components/auth/PasswordField/PasswordField.jsx'
import SocialLoginButtons from '../../../components/auth/SocialLoginButtons/SocialLoginButtons.jsx'
import useAuth from '../../../context/useAuth.jsx'
import { isApiConfigured } from '../../../config/api.js'
import { requestLoginOtp } from '../../../services/authService.js'
import './Login.css'

function validateField(field, value) {
  if (field === 'email') {
    if (!value.trim()) return 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Please enter a valid email address.'
  }
  if (field === 'password' && !value) return 'Password is required.'
  return ''
}

function isSafeInternalRoute(target) {
  if (!target || typeof target !== 'string' || !target.startsWith('/')) return false
  const cleanTarget = target.split('?')[0].split('#')[0]
  const allowed = ['/student/dashboard', '/instructor/dashboard', '/admin/dashboard', '/about', '/cad-models', '/courses', '/services', '/contact']
  return allowed.some((route) => cleanTarget === route || cleanTarget.startsWith(`${route}/`))
}

function Login() {
  const { login, loginWithOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(location.state?.authMessage || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState('password')
  const [otpRequested, setOtpRequested] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpCooldown, setOtpCooldown] = useState(0)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const isConfigured = isApiConfigured

  useEffect(() => {
    if (!otpCooldown) return undefined
    const timer = window.setTimeout(() => setOtpCooldown((remaining) => Math.max(0, remaining - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [otpCooldown])

  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); const error = validateField(field, value); setErrors((current) => ({ ...current, [field]: error || undefined })); if (field === 'email' && mode === 'otp') { setOtpRequested(false); setOtp(''); setOtpCooldown(0) } setStatus('') }
  const validate = () => Object.fromEntries(Object.entries(form).map(([field, value]) => [field, validateField(field, value)]).filter(([, error]) => error))
  const finishLogin = (user) => {
    const destination = user.role === 'admin' ? '/admin/dashboard' : user.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard'
    const requested = location.state?.from
    const requestedPath = requested ? `${requested.pathname}${requested.search ?? ''}` : ''
    const safeRequested = isSafeInternalRoute(requestedPath) ? requestedPath : ''
    const requestedRole = requested?.pathname?.startsWith('/admin/') ? 'admin' : requested?.pathname?.startsWith('/instructor/') ? 'instructor' : requested?.pathname?.startsWith('/student/') ? 'student' : null
    navigate(requestedRole === user.role && safeRequested ? safeRequested : destination, { replace: true })
  }

  const submit = async (event) => {
    event.preventDefault()
    if (mode === 'otp') {
      const nextErrors = {}
      if (!form.email.trim()) nextErrors.email = 'Email is required.'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Please enter a valid email address.'
      if (otpRequested && !/^\d{6}$/.test(otp)) nextErrors.otp = 'Enter the 6-digit code from your email.'
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors)
        return
      }
      if (!isConfigured) {
        setStatus('Authentication is not connected yet.')
        return
      }
      setIsSubmitting(true)
      setStatus('')
      try {
        if (!otpRequested) {
          const response = await requestLoginOtp(form.email.trim())
          setOtpRequested(true)
          setOtpCooldown(response.data?.data?.resendAfterSeconds || 60)
          setStatus('If this email is registered and verified, a sign-in code will be sent.')
          return
        }
        const result = await loginWithOtp({ email: form.email.trim(), otp })
        finishLogin(result.user)
      } catch (error) {
        setErrors(error.authDetails?.fieldErrors ?? {})
        setStatus(error.authDetails?.message ?? 'Unable to sign in with this code. Request a new one and try again.')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    const nextErrors = validate()
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      const firstField = Object.keys(nextErrors)[0]
        ; (firstField === 'email' ? emailRef : passwordRef).current?.focus()
      return
    }
    if (!isConfigured) {
      setStatus('Authentication is not connected yet.')
      return
    }
    setIsSubmitting(true)
    setStatus('')
    try {
      const result = await login(form)
      finishLogin(result.user)
    } catch (error) {
      const serverErrors = error.authDetails?.fieldErrors ?? {}
      setErrors(serverErrors)
      const firstField = Object.keys(serverErrors)[0]
        ; (firstField === 'email' ? emailRef : passwordRef).current?.focus()
      setStatus(error.authDetails?.message ?? 'Invalid email or password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-form-card">
        <span className="categories-eyebrow">ACCOUNT ACCESS</span>
        <h2>Welcome Back</h2>
        <p className="auth-form-description">Sign in to continue your CAD learning and design journey.</p>
        <div className="auth-mode-switch" role="tablist" aria-label="Sign-in method">
          <button type="button" role="tab" aria-selected={mode === 'password'} className={mode === 'password' ? 'is-active' : ''} onClick={() => { setMode('password'); setStatus(''); setErrors({}) }}>Password</button>
          <button type="button" role="tab" aria-selected={mode === 'otp'} className={mode === 'otp' ? 'is-active' : ''} onClick={() => { setMode('otp'); setStatus(''); setErrors({}) }}>Email code</button>
        </div>
        {status && <div className={`auth-status ${status === 'Authentication is not connected yet.' || status.startsWith('If this email is registered') ? 'auth-notice' : 'auth-status-error'}`} role={status.startsWith('If this email is registered') ? 'status' : 'alert'} aria-live="polite">{status}</div>}
        <form onSubmit={submit} noValidate>
          <div className="auth-field">
            <label htmlFor="login-email">Email Address <span aria-hidden="true">*</span></label>
            <input ref={emailRef} id="login-email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} onBlur={() => setErrors((current) => ({ ...current, email: validateField('email', form.email) || undefined }))} placeholder="Enter your email address" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined} />
            {errors.email && <span className="auth-field-error" id="login-email-error" role="alert">{errors.email}</span>}
          </div>
          {mode === 'password' && <PasswordField id="login-password" label="Password" value={form.password} onChange={(event) => update('password', event.target.value)} onBlur={() => setErrors((current) => ({ ...current, password: validateField('password', form.password) || undefined }))} inputRef={passwordRef} error={errors.password} autoComplete="current-password" placeholder="Enter your password" />}
          {mode === 'otp' && otpRequested && <div className="auth-field"><label htmlFor="login-otp">6-digit email code <span aria-hidden="true">*</span></label><input id="login-otp" type="text" value={otp} onChange={(event) => { setOtp(event.target.value.replace(/\D/g, '').slice(0, 6)); setErrors((current) => ({ ...current, otp: undefined })); setStatus('') }} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Enter code" aria-invalid={Boolean(errors.otp)} aria-describedby={errors.otp ? 'login-otp-error' : undefined} />{errors.otp && <span className="auth-field-error" id="login-otp-error">{errors.otp}</span>}</div>}
          <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting || !isConfigured}>{isSubmitting ? (mode === 'otp' && !otpRequested ? 'Sending code...' : 'Signing In...') : mode === 'otp' ? (otpRequested ? 'Verify & Sign In' : 'Send sign-in code') : 'Sign In'}</button>
          {mode === 'otp' && otpRequested && <button className="auth-resend-code" type="button" disabled={isSubmitting || otpCooldown > 0} onClick={async () => { setIsSubmitting(true); setStatus(''); try { const response = await requestLoginOtp(form.email.trim()); setOtpCooldown(response.data?.data?.resendAfterSeconds || 60); setStatus('If this email is registered and verified, a sign-in code will be sent.') } catch (error) { setStatus(error.authDetails?.message || 'Unable to request a new code right now.') } finally { setIsSubmitting(false) } }}>{otpCooldown > 0 ? `Resend available in ${otpCooldown}s` : 'Resend code'}</button>}
        </form>
        <SocialLoginButtons />
        <p className="auth-switch"><Link to="/forgot-password">Forgot Password?</Link></p>
        <p className="auth-switch">Don’t have an account? <Link to="/register">Create an account</Link></p>
      </div>
    </AuthLayout>
  )
}

export default Login
