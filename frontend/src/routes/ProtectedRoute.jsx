import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth.jsx'

function ProtectedRoute({ allowedRoles, children }) {
  const { user, isAuthenticated, isLoading, authMessage } = useAuth()
  const location = useLocation()
  if (isLoading) return <main className="auth-loading" aria-live="polite">Checking your session...</main>
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location, authMessage }} />
  if (!allowedRoles.includes(user?.role)) {
    const destination = user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard'
    return <Navigate to={destination} replace />
  }
  return children
}

export default ProtectedRoute