import { BookOpenText, Edit3, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchInstructorCourses } from '../../services/instructorService.js'

function InstructorCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [reviewStatus, setReviewStatus] = useState('all')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    fetchInstructorCourses({ search, status, reviewStatus })
      .then((result) => {
        if (!active) return
        setCourses(result.courses ?? [])
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.response?.data?.message || 'Unable to load assigned courses.')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => { active = false }
  }, [search, status, reviewStatus])

  const visibleCourses = useMemo(() => courses, [courses])

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">COURSE PORTFOLIO</p>
          <h1>My Courses</h1>
          <p>Review assigned courses, update learning content, and submit for review.</p>
        </div>
      </header>

      <div className="admin-filters">
        <label>
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title or software" />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          Review status
          <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)}>
            <option value="all">All</option>
            <option value="not_submitted">Not submitted</option>
            <option value="pending">Pending</option>
            <option value="changes_requested">Changes requested</option>
            <option value="approved">Approved</option>
          </select>
        </label>
      </div>

      {loading && <p className="admin-state">Loading assigned courses...</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      {!loading && !error && (
        visibleCourses.length === 0 ? (
          <p className="admin-state">No assigned courses match the current filter.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Software</th>
                  <th>Level</th>
                  <th>Review</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleCourses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <strong>{course.title}</strong>
                      <small>{course.slug}</small>
                    </td>
                    <td>{course.software}</td>
                    <td>{course.level}</td>
                    <td>{course.reviewStatus}</td>
                    <td>{course.status}</td>
                    <td>{course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : '-'}</td>
                    <td className="admin-actions">
                      <Link to={`/instructor/courses/${course.id}/edit`} aria-label={`Edit ${course.title}`}><Edit3 size={16} /></Link>
                      <Link to={`/instructor/courses/${course.id}/curriculum`} aria-label={`Manage curriculum for ${course.title}`}><BookOpenText size={16} /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </main>
  )
}

export default InstructorCourses
