import { BookOpen, CheckCircle2, Clock3, FileText, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useAuth from '../../../context/useAuth.jsx'
import { fetchInstructorDashboard } from '../../../services/instructorService.js'
import './InstructorDashboard.css'

function InstructorDashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchInstructorDashboard()
      setDashboard(result)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load instructor dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDashboard() }, [])

  const firstName = user?.name?.trim()?.split(/\s+/)[0] || dashboard?.instructor?.name?.trim()?.split(/\s+/)[0] || 'Instructor'
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  if (loading) {
    return <main className="instructor-dashboard"><p className="admin-state">Loading dashboard...</p></main>
  }

  return (
    <main className="instructor-dashboard">
      <header className="instructor-dashboard-header">
        <div className="instructor-dashboard-header-copy">
          <p className="instructor-kicker">OVERVIEW</p>
          <h1>Welcome back, {displayName}</h1>
          <p>Manage your assigned courses, curriculum, and assessments.</p>
        </div>
        <div className="instructor-dashboard-action">
          <Link className="button button-primary" to="/instructor/courses">Manage Courses</Link>
        </div>
      </header>

      {error && <div className="instructor-dashboard-error" role="alert">{error}</div>}

      {!error && dashboard && (
        <>
          <section className="instructor-summary-grid" aria-label="Instructor summary">
            <SummaryCard icon={BookOpen} label="Assigned Courses" value={dashboard.summary?.assignedCourses ?? 0} />
            <SummaryCard icon={FileText} label="Draft Courses" value={dashboard.summary?.draftCourses ?? 0} />
            <SummaryCard icon={Clock3} label="Pending Review" value={dashboard.summary?.pendingReview ?? 0} />
            <SummaryCard icon={CheckCircle2} label="Published" value={dashboard.summary?.publishedCourses ?? 0} />
          </section>

          <section className="instructor-panel" aria-labelledby="recent-courses-heading">
            <div className="instructor-panel-header">
              <h3 id="recent-courses-heading">Recent Courses</h3>
              <button type="button" className="button button-outline" onClick={loadDashboard}><RefreshCw size={15} /> Refresh</button>
            </div>

            {dashboard.recentCourses?.length ? (
              <div className="instructor-dashboard-table-wrap">
                <table className="instructor-dashboard-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Software</th>
                      <th>Status</th>
                      <th>Review</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recentCourses.map((course) => (
                      <tr key={course.id}>
                        <td>
                          <strong>{course.title}</strong>
                          <small>{course.slug}</small>
                        </td>
                        <td>{course.software}</td>
                        <td><span className="instructor-course-status" data-tone={course.status || 'draft'}>{formatStatus(course.status)}</span></td>
                        <td><span className="instructor-review-status" data-tone={course.reviewStatus || 'not_submitted'}>{formatReviewStatus(course.reviewStatus)}</span></td>
                        <td><Link className="button button-outline" to={`/instructor/courses/${course.id}/edit`}>Open</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="instructor-dashboard-empty">
                <strong>No courses assigned yet</strong>
                <span>Courses assigned by an administrator will appear here.</span>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <article className="instructor-summary-card">
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function formatStatus(value) {
  const labels = { draft: 'Draft', published: 'Published', archived: 'Archived' }
  return labels[value] || 'Draft'
}

function formatReviewStatus(value) {
  const labels = {
    not_submitted: 'Not Submitted',
    pending: 'Pending Review',
    changes_requested: 'Changes Requested',
    approved: 'Approved'
  }
  return labels[value] || 'Not Submitted'
}

export default InstructorDashboard