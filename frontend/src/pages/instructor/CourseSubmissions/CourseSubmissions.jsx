import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Eye, Search } from 'lucide-react'
import { fetchCourseSubmissions } from '../../../services/instructorSubmissionService.js'
import './CourseSubmissions.css'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function statusLabel(value) {
  const map = {
    submitted: 'Submitted',
    late: 'Late',
    under_review: 'Under Review',
    graded: 'Graded',
    resubmission_requested: 'Resubmission Requested'
  }
  return map[value] || value || 'Submitted'
}

function CourseSubmissions() {
  const { courseId } = useParams()
  const [submissions, setSubmissions] = useState([])
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSubmissions = () => {
    setLoading(true)
    setError('')
    fetchCourseSubmissions(courseId, { assignmentId: assignmentFilter === 'all' ? '' : assignmentFilter, status: statusFilter === 'all' ? '' : statusFilter, search })
      .then((result) => setSubmissions(Array.isArray(result) ? result : []))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load submissions.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (courseId) loadSubmissions()
  }, [courseId, assignmentFilter, statusFilter, search])

  const stats = useMemo(() => ({
    total: submissions.length,
    awaiting: submissions.filter((row) => ['submitted', 'late', 'under_review'].includes(row.status)).length,
    late: submissions.filter((row) => row.status === 'late').length,
    graded: submissions.filter((row) => row.status === 'graded').length
  }), [submissions])

  return (
    <main className="instructor-content-page submissions-page">
      <header className="student-page-header">
        <div>
          <p className="welcome-kicker">Course Queue</p>
          <h1>Submissions</h1>
        </div>
      </header>

      <section className="summary-grid performance-grid">
        <div className="summary-card"><span>Total</span><strong>{stats.total}</strong></div>
        <div className="summary-card"><span>Awaiting review</span><strong>{stats.awaiting}</strong></div>
        <div className="summary-card"><span>Late</span><strong>{stats.late}</strong></div>
        <div className="summary-card"><span>Graded</span><strong>{stats.graded}</strong></div>
      </section>

      <section className="student-panel submissions-filter-panel">
        <div className="student-search-wrap">
          <Search size={16} aria-hidden="true" />
          <input value={search} placeholder="Search student name" onChange={(event) => setSearch(event.target.value)} />
        </div>
        <select value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value)}>
          <option value="all">All assignments</option>
          <option value="assignment">Assignment</option>
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="late">Late</option>
          <option value="graded">Graded</option>
        </select>
      </section>

      {error && <div className="dashboard-error" role="alert"><strong>{error}</strong></div>}
      {loading && <div className="dashboard-skeleton" role="status" aria-live="polite">Loading submissions…</div>}

      {!loading && !error && (
        <section className="student-panel submissions-table-panel">
          <div className="submission-table-header">
            <span>Student</span>
            <span>Assignment</span>
            <span>Revision</span>
            <span>Submitted</span>
            <span>Status</span>
            <span>Marks</span>
            <span>Action</span>
          </div>
          {submissions.length === 0 ? <p className="empty-state">No submissions match the current filters.</p> : submissions.map((submission) => (
            <div key={submission.id} className="submission-table-row">
              <span>{submission.student?.name || 'Student'}</span>
              <span>{submission.assignmentTitle || 'Assignment'}</span>
              <span>{submission.revisionNumber}</span>
              <span>{formatDate(submission.submittedAt)}</span>
              <span>{statusLabel(submission.status)}</span>
              <span>{submission.marksAwarded !== null && submission.marksAwarded !== undefined ? `${submission.marksAwarded}/${submission.maximumMarks || 0}` : '—'}</span>
              <Link className="button button-secondary" to={`/instructor/submissions/${submission.id}/review`}><Eye size={16} /> Review</Link>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}

export default CourseSubmissions
