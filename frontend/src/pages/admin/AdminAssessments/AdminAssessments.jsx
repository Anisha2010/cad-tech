import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { fetchAdminAssessments } from '../../../services/adminAssessmentService.js'
import './AdminAssessments.css'

function AdminAssessments() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ type: 'all', reviewStatus: 'all', publicationStatus: 'all', courseId: '', search: '' })

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await fetchAdminAssessments(filters)
        setItems(response.assessments ?? [])
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load assessments.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filters.type, filters.reviewStatus, filters.publicationStatus, filters.courseId, filters.search])

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">ASSESSMENT REVIEW</p>
          <h1>Assessment Management</h1>
          <p>Review quizzes and assignments submitted by assigned instructors.</p>
        </div>
      </header>

      <div className="admin-filters">
        <label><Search size={16} /> <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search assessments" /></label>
        <label>Type<select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}><option value="all">All</option><option value="quiz">Quiz</option><option value="assignment">Assignment</option></select></label>
        <label>Review<select value={filters.reviewStatus} onChange={(event) => setFilters((current) => ({ ...current, reviewStatus: event.target.value }))}><option value="all">All</option><option value="pending">Pending</option><option value="changes_requested">Changes requested</option><option value="approved">Approved</option></select></label>
        <label>Publication<select value={filters.publicationStatus} onChange={(event) => setFilters((current) => ({ ...current, publicationStatus: event.target.value }))}><option value="all">All</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
      </div>

      {loading && <p className="admin-state">Loading assessments...</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      {!loading && !error && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Title</th><th>Type</th><th>Course</th><th>Instructor</th><th>Review</th><th>Publication</th><th>Submitted</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan="8"><p className="admin-state">No assessments match the current filters.</p></td></tr> : items.map((item) => (
                <tr key={`${item.type}-${item.id}`}>
                  <td><strong>{item.title}</strong></td>
                  <td>{item.type === 'quiz' ? 'Quiz' : 'Assignment'}</td>
                  <td>{item.course?.title || '-'}</td>
                  <td>{item.instructor?.name || '-'}</td>
                  <td>{item.reviewStatus}</td>
                  <td>{item.publicationStatus}</td>
                  <td>{item.submittedForReviewAt ? new Date(item.submittedForReviewAt).toLocaleDateString() : '-'}</td>
                  <td className="admin-actions">
                    <Link to={item.type === 'quiz' ? `/admin/quizzes/${item.id}/review` : `/admin/assignments/${item.id}/review`} aria-label={`Review ${item.title}`}>Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

export default AdminAssessments
