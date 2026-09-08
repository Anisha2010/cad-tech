import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../../../components/auth/AuthLayout/AuthLayout.jsx'
import PasswordField from '../../../components/auth/PasswordField/PasswordField.jsx'
import SocialLoginButtons from '../../../components/auth/SocialLoginButtons/SocialLoginButtons.jsx'
import useAuth from '../../../context/useAuth.jsx'
import { isApiConfigured } from '../../../config/api.js'
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
  const allowed = ['/student/dashboard', '/instructor/dashboard', '/about', '/cad-models', '/courses', '/services', '/contact']
  return allowed.some((route) => cleanTarget === route || cleanTarget.startsWith(`${route}/`))
}

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const isConfigured = isApiConfigured

  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); const error = validateField(field, value); setErrors((current) => ({ ...current, [field]: error || undefined })); setStatus('') }
  const validate = () => Object.fromEntries(Object.entries(form).map(([field, value]) => [field, validateField(field, value)]).filter(([, error]) => error))
  const submit = async (event) => {
    event.preventDefault()
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
      const destination = result.user.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard'
      const requested = location.state?.from
      const requestedPath = requested ? `${requested.pathname}${requested.search ?? ''}` : ''
      const safeRequested = isSafeInternalRoute(requestedPath) ? requestedPath : ''
      const requestedRole = requested?.pathname?.startsWith('/instructor/') ? 'instructor' : requested?.pathname?.startsWith('/student/') ? 'student' : null
      navigate(requestedRole === result.user.role && safeRequested ? safeRequested : destination, { replace: true })
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
        {status && <div className={`auth-status ${status === 'Authentication is not connected yet.' ? 'auth-notice' : 'auth-status-error'}`} role="alert" aria-live="polite">{status}</div>}
        <form onSubmit={submit} noValidate>
          <div className="auth-field">
            <label htmlFor="login-email">Email Address <span aria-hidden="true">*</span></label>
            <input ref={emailRef} id="login-email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} onBlur={() => setErrors((current) => ({ ...current, email: validateField('email', form.email) || undefined }))} placeholder="Enter your email address" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined} />
            {errors.email && <span className="auth-field-error" id="login-email-error" role="alert">{errors.email}</span>}
          </div>
          <PasswordField id="login-password" label="Password" value={form.password} onChange={(event) => update('password', event.target.value)} onBlur={() => setErrors((current) => ({ ...current, password: validateField('password', form.password) || undefined }))} inputRef={passwordRef} error={errors.password} autoComplete="current-password" placeholder="Enter your password" />
          <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting || !isConfigured}>{isSubmitting ? 'Signing In...' : 'Sign In'}</button>
        </form>
        <SocialLoginButtons />
        <p className="auth-switch">Don’t have an account? <Link to="/register">Create an account</Link></p>
      </div>
    </AuthLayout>
  )
}

export default Login
