import { Link } from 'react-router-dom'
import useAuth from '../../context/useAuth.jsx'

function AdminDashboard() {
  const { user } = useAuth()

  return (
    <main className="page-placeholder">
      <h1>Admin Dashboard</h1>
      <p>Welcome, {user?.name || 'Admin'}.</p>
      <p>Manage the MongoDB-backed course catalog, pricing, and enrollment status here.</p>
      <Link className="button button-primary" to="/admin/courses">Open Course Management</Link>
    </main>
  )
}

export default AdminDashboard
