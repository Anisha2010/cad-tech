import { useState } from 'react'
import { Github } from 'lucide-react'
import { startGitHubAuthentication, startGoogleAuthentication } from '../../../services/authService.js'
import { isApiConfigured } from '../../../config/api.js'
import './SocialLoginButtons.css'

function SocialLoginButtons() {
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isConfigured = isApiConfigured

  const handleProviderAuth = (provider) => {
    if (!isConfigured) {
      setStatus('Social authentication is not connected yet.')
      return
    }

    setStatus('')
    setIsSubmitting(true)

    try {
      if (provider === 'google') {
        startGoogleAuthentication()
      } else {
        startGitHubAuthentication()
      }
    } catch (error) {
      setStatus(error.message || 'Social authentication is not connected yet.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="social-login-wrapper" aria-live="polite">
      <div className="social-divider" aria-hidden="true">
        <span>Or continue with</span>
      </div>

      {status && <p className="social-login-status" role="status">{status}</p>}

      <div className="social-button-group">
        <button
          type="button"
          className="social-login-button"
          onClick={() => handleProviderAuth('google')}
          disabled={isSubmitting}
          aria-label="Continue with Google"
        >
          <span className="social-login-icon google-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.98h5.45c-.23 1.33-1.6 3.92-5.45 3.92-3.28 0-5.95-2.72-5.95-6.06s2.67-6.06 5.95-6.06c1.87 0 3.13.8 3.85 1.49l2.62-2.54C16.9 3.28 14.72 2.4 12 2.4 6.99 2.4 2.8 6.66 2.8 11.9c0 5.24 4.19 9.5 9.2 9.5 5.31 0 8.82-3.73 8.82-8.98 0-.6-.06-1.05-.13-1.5H12Z" />
            </svg>
          </span>
          <span>{isSubmitting ? 'Connecting...' : 'Continue with Google'}</span>
        </button>

        <button
          type="button"
          className="social-login-button"
          onClick={() => handleProviderAuth('github')}
          disabled={isSubmitting}
          aria-label="Continue with GitHub"
        >
          <span className="social-login-icon" aria-hidden="true">
            <Github size={18} />
          </span>
          <span>{isSubmitting ? 'Connecting...' : 'Continue with GitHub'}</span>
        </button>
      </div>
    </div>
  )
}

export default SocialLoginButtons
