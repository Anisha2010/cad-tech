import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../../context/useAuth.jsx'
import './OAuthCallback.css'

function OAuthCallback() {
  const location = useLocation()
  const navigate = useNavigate()
  const { refreshUser, user } = useAuth()
  const [message, setMessage] = useState('Completing sign in...')

  useEffect(() => {
    let active = true

    const run = async () => {
      const params = new URLSearchParams(location.search)
      const status = params.get('status')
      const reason = params.get('reason')

      if (status === 'error') {
        if (reason === 'cancelled') {
          setMessage('Social sign-in was cancelled.')
        } else {
          setMessage('Social sign-in could not be completed. Please try again.')
        }

        window.setTimeout(() => {
          if (active) navigate('/login', { replace: true })
        }, 1200)
        return
      }

      try {
        const response = await refreshUser()
        const confirmedUser = response?.data?.user ?? response?.user ?? null

        if (!confirmedUser || !['student', 'instructor'].includes(confirmedUser.role)) {
          setMessage('This account does not have access to the requested area.')
          window.setTimeout(() => {
            if (active) navigate('/login', { replace: true })
          }, 1200)
          return
        }

        const target = confirmedUser.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard'
        navigate(target, { replace: true })
      } catch {
        setMessage('Social sign-in could not be completed. Please try again.')
        window.setTimeout(() => {
          if (active) navigate('/login', { replace: true })
        }, 1200)
      }
    }

    run()
    return () => { active = false }
  }, [location.search, navigate, refreshUser, user])

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
