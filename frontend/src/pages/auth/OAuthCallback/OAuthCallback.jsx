import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../../context/useAuth.jsx'
import './OAuthCallback.css'

function OAuthCallback() {
  const location = useLocation()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [message, setMessage] = useState('Completing sign in...')
  const refreshAuthUser = useEffectEvent(() => refreshUser())
  const callbackAttemptRef = useRef(null)

  useEffect(() => {
    if (callbackAttemptRef.current?.search !== location.search) {
      callbackAttemptRef.current = { search: location.search, refreshPromise: null, handled: false, mountedLogged: false, startedLogged: false }
    }
    const callbackAttempt = callbackAttemptRef.current
    let active = true
    const params = new URLSearchParams(location.search)
    const provider = params.get('provider')
    if (!callbackAttempt.mountedLogged) {
      callbackAttempt.mountedLogged = true
      console.info('[OAuthCallback] mounted', { provider: provider === 'google' || provider === 'github' ? provider : 'unknown' })
    }

    const run = async () => {
      const status = params.get('status')
      const reason = params.get('reason')

      if (status !== 'success') {
        if (status === 'error' && reason === 'cancelled') {
          setMessage('Social sign-in was cancelled.')
        } else {
          setMessage('Social sign-in could not be completed. Please try again.')
        }

        callbackAttempt.handled = true
        window.setTimeout(() => {
          if (active) navigate('/login', { replace: true })
        }, 1200)
        return
      }

      try {
        if (!callbackAttempt.startedLogged) {
          callbackAttempt.startedLogged = true
          console.info('[OAuthCallback] processing started')
        }
        callbackAttempt.refreshPromise ??= refreshAuthUser()
        const response = await callbackAttempt.refreshPromise
        if (!active || callbackAttempt.handled) return
        const confirmedUser = response?.data?.user ?? response?.user ?? null

        if (!confirmedUser || !['student', 'instructor'].includes(confirmedUser.role)) {
          callbackAttempt.handled = true
          console.error('[OAuthCallback] processing failed', { stage: 'session-check' })
          setMessage('This account does not have access to the requested area.')
          window.setTimeout(() => {
            if (active) navigate('/login', { replace: true })
          }, 1200)
          return
        }

        callbackAttempt.handled = true
        const target = confirmedUser.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard'
        console.info('[OAuthCallback] processing completed')
        navigate(target, { replace: true })
      } catch {
        if (!active || callbackAttempt.handled) return
        callbackAttempt.handled = true
        console.error('[OAuthCallback] processing failed', { stage: 'session-refresh' })
        setMessage('Social sign-in could not be completed. Please try again.')
        window.setTimeout(() => {
          if (active) navigate('/login', { replace: true })
        }, 1200)
      }
    }

    run()
    return () => { active = false }
  }, [location.search, navigate])

  return (
    <main className="oauth-callback-page">
      <div className="oauth-callback-card" role="status" aria-live="polite">
        <h1>Completing sign in...</h1>
        <p>{message}</p>
      </div>
    </main>
  )
}

export default OAuthCallback
