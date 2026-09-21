import { ArrowRight, BookOpen, CreditCard, GraduationCap, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../context/useAuth.jsx'
import { getAdminDashboard } from '../../services/adminService.js'
import './AdminDashboard.css'

function AdminDashboard() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadDashboard = async (activeRef) => {
    setLoading(true)
    setError(false)
    try {
      const data = await getAdminDashboard()
      if (!data || typeof data !== 'object' || !data.counts) throw new Error('Invalid dashboard response.')
      const numberOrZero = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
      const normalizedDashboard = {
        counts: {
          students: numberOrZero(data.counts.students),
          instructors: numberOrZero(data.counts.instructors),
          courses: numberOrZero(data.counts.courses),
          publishedCourses: numberOrZero(data.counts.publishedCourses),
          activeEnrollments: numberOrZero(data.counts.activeEnrollments),
          verifiedPayments: numberOrZero(data.counts.verifiedPayments)
        },
        paymentSummary: {
          currency: data.paymentSummary?.currency ?? 'INR',
          paidAmountInPaise: numberOrZero(data.paymentSummary?.paidAmountInPaise),
          mode: data.paymentSummary?.mode ?? 'test'
        },
        recentEnrollments: Array.isArray(data.recentEnrollments) ? data.recentEnrollments : [],
        recentPayments: Array.isArray(data.recentPayments) ? data.recentPayments : []
      }
      if (activeRef.current) setDashboard(normalizedDashboard)
    } catch (requestError) {
      if (!activeRef.current) return
      const status = requestError.response?.status
      if (status === 401) {
        navigate('/login', { replace: true, state: { from: location } })
        return
      }
      setError(status === 404 ? 'Admin dashboard route is unavailable on the backend.' : status === 403 ? 'You do not have permission to view this dashboard.' : 'Unable to load admin dashboard.')
    } finally {
      if (activeRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    const activeRef = { current: true }
    loadDashboard(activeRef)
    return () => { activeRef.current = false }
  }, [])

  if (loading) return <p className="admin-status" aria-live="polite">Loading admin dashboard...</p>
  if (error) return <div className="admin-error-panel" role="alert"><p>{error}</p><button className="button button-primary" type="button" onClick={() => loadDashboard({ current: true })}>Retry</button></div>

  const counts = dashboard.counts
  const stats = [['Total Students', counts.students, Users], ['Total Instructors', counts.instructors, GraduationCap], ['Total Courses', counts.courses, BookOpen], ['Published Courses', counts.publishedCourses, BookOpen], ['Active Enrollments', counts.activeEnrollments, GraduationCap], ['Verified Test Payments', counts.verifiedPayments, CreditCard]]
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Admin'
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(dashboard.paymentSummary.paidAmountInPaise / 100)

  return <div className="admin-dashboard"><div className="admin-dashboard-intro"><div><p className="admin-kicker">OVERVIEW</p><h2>Welcome back, {firstName}</h2><p>Here is the latest view of your learning platform.</p></div><span className="test-mode-badge">Razorpay Test Mode</span></div><section className="admin-stats" aria-label="Platform statistics">{stats.map(([label, value, Icon]) => <article className="admin-stat-card" key={label}><span className="admin-stat-icon"><Icon size={20} /></span><span>{label}</span><strong>{value}</strong></article>)}</section><section className="admin-dashboard-grid"><article className="admin-panel payment-summary"><div className="admin-panel-heading"><div><p className="admin-kicker">PAYMENTS</p><h3>Test Payment Volume</h3></div><CreditCard size={22} /></div><strong className="payment-total">{amount}</strong><p>Razorpay Test Mode. This amount is not real business revenue.</p></article><article className="admin-panel quick-actions"><div className="admin-panel-heading"><div><p className="admin-kicker">SHORTCUTS</p><h3>Quick Actions</h3></div><ArrowRight size={22} /></div><div className="quick-action-links"><Link to="/admin/courses">Manage Courses <ArrowRight size={16} /></Link><Link to="/admin/students">View Students <ArrowRight size={16} /></Link><Link to="/admin/enrollments">View Enrollments <ArrowRight size={16} /></Link><Link to="/admin/payments">View Payments <ArrowRight size={16} /></Link></div></article></section><section className="admin-dashboard-grid"><RecentEnrollments enrollments={dashboard.recentEnrollments} /><RecentPayments payments={dashboard.recentPayments} /></section></div>
}

function RecentEnrollments({ enrollments }) { return <article className="admin-panel admin-list-panel"><div className="admin-panel-heading"><h3>Recent Enrollments</h3></div>{enrollments.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Student</th><th>Course</th><th>Status</th></tr></thead><tbody>{enrollments.map((item) => <tr key={item.id}><td><strong>{item.student?.name || 'Unknown student'}</strong><small>{item.student?.email}</small></td><td>{item.courseSlug || '-'}</td><td>{item.status}</td></tr>)}</tbody></table></div> : <p className="admin-empty" aria-live="polite">No enrollments found.</p>}</article> }
function RecentPayments({ payments }) { return <article className="admin-panel admin-list-panel"><div className="admin-panel-heading"><h3>Recent Verified Payments</h3></div>{payments.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Course</th><th>Amount</th><th>Date</th></tr></thead><tbody>{payments.map((item) => <tr key={item.id}><td>{item.courseSlug || '-'}</td><td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: item.currency }).format(item.amount / 100)}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <p className="admin-empty" aria-live="polite">No verified test payments found.</p>}</article> }

export default AdminDashboard
