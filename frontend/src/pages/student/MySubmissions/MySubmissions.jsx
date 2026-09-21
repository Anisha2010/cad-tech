import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, RefreshCw } from 'lucide-react'
import { fetchStudentSubmissions } from '../../../services/studentAssignmentService.js'
import './MySubmissions.css'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function statusLabel(value) {
  const map = {
    draft: 'Draft',
    submitted: 'Submitted',
    late: 'Late',
    under_review: 'Under Review',
    graded: 'Graded',
    resubmission_requested: 'Resubmission Requested'
  }
  return map[value] || 'Submitted'
}

function MySubmissions() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSubmissions = () => {
    setLoading(true)
    setError('')
    fetchStudentSubmissions()
      .then((result) => setSubmissions(Array.isArray(result) ? result : []))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load your submissions.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSubmissions()
  }, [])

  return (
    <main className="student-content-area">
      <header className="student-page-header">
        <div>
          <p className="welcome-kicker">Submission History</p>
          <h1>My Submissions</h1>
        </div>
      </header>

      {error && <div className="dashboard-error" role="alert"><div><strong>{error}</strong><p>Please try again in a moment.</p></div><button className="button button-outline" type="button" onClick={loadSubmissions}><RefreshCw size={16} /> Try again</button></div>}
      {loading && <div className="dashboard-skeleton" role="status" aria-live="polite">Loading submissions…</div>}

      {!loading && !error && (
        <section className="student-panel submissions-list-panel">
          {submissions.length === 0 ? (
            <div className="empty-state"><h3>No submissions yet</h3><p>Your submitted assignments will appear here.</p></div>
          ) : (
            <div className="submission-list-grid">
              {submissions.map((submission) => (
                <article key={submission.id} className="submission-card">
                  <div className="submission-card-top">
                    <span className="submission-status-badge">{statusLabel(submission.status)}</span>
                    <span className="revision-pill">Revision {submission.revisionNumber}</span>
                  </div>
                  <h3>{submission.assignmentTitle || 'Assignment'}</h3>
                  <p>{submission.courseTitle || 'Course'}</p>
                  <dl>
                    <div><dt>Submitted</dt><dd>{formatDate(submission.submittedAt)}</dd></div>
                    <div><dt>Marks</dt><dd>{submission.marksAwarded !== null && submission.marksAwarded !== undefined ? `${submission.marksAwarded}/${submission.maximumMarks}` : 'Pending'}</dd></div>
                  </dl>
                  <Link className="button button-primary" to={`/student/submissions/${submission.id}`}><Eye size={16} /> View Details</Link>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}

export default MySubmissions
