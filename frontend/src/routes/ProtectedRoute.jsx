import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth.jsx'

function ProtectedRoute({ allowedRoles, children }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <main className="auth-loading" aria-live="polite">Checking your session...</main>
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (!allowedRoles.includes(user?.role)) return <Navigate to={user?.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard'} replace />
  return children
}

export default ProtectedRoute