import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAdminAssignmentReview, approveAdminAssignmentReview, requestAdminAssignmentChanges, publishAdminAssignment, unpublishAdminAssignment, archiveAdminAssignment } from '../../../services/adminAssessmentService.js'

function AdminAssignmentReview() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState(null)
  const [course, setCourse] = useState(null)
  const [instructor, setInstructor] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const response = await getAdminAssignmentReview(assignmentId)
      setAssignment(response.assessment)
      setCourse(response.course)
      setInstructor(response.instructor)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load assignment review.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (assignmentId) load() }, [assignmentId])

  const action = async (fn) => {
    try {
      await fn()
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Action failed.')
    }
  }

  if (loading) return <main className="admin-page"><p className="admin-state">Loading assignment review...</p></main>
  if (!assignment) return <main className="admin-page"><p className="admin-error" role="alert">{error || 'Assignment not found.'}</p></main>

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">ASSIGNMENT REVIEW</p>
          <h1>{assignment.title}</h1>
          <p>{course?.title || 'Course'} • {instructor?.name || 'Instructor'}</p>
        </div>
      </header>

      <section className="admin-panel">
        <h3>Assignment details</h3>
        <p>Due date: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'} • Marks: {assignment.maximumMarks} • Status: {assignment.reviewStatus}</p>
        <p>{assignment.description || 'No description provided.'}</p>
        <p>{assignment.instructions || 'No instructions provided.'}</p>
      </section>

      {assignment.resources?.length > 0 && (
        <section className="admin-panel">
          <h3>Resources</h3>
          <ul>
            {assignment.resources.map((resource) => <li key={resource.url || resource.title}><a href={resource.url} target="_blank" rel="noreferrer">{resource.title || resource.url}</a></li>)}
          </ul>
        </section>
      )}

      {assignment.reviewFeedback && <section className="admin-panel"><h3>Feedback</h3><p>{assignment.reviewFeedback}</p></section>}

      <section className="admin-panel">
        <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Request change feedback" rows={4} />
        <div className="assessment-builder-actions">
          <button type="button" className="button button-primary" onClick={() => action(() => approveAdminAssignmentReview(assignmentId))}>Approve</button>
          <button type="button" className="button button-secondary" onClick={() => action(() => requestAdminAssignmentChanges(assignmentId, feedback))}>Request Changes</button>
          <button type="button" className="button button-secondary" onClick={() => action(() => publishAdminAssignment(assignmentId))}>Publish</button>
          <button type="button" className="button button-secondary" onClick={() => action(() => unpublishAdminAssignment(assignmentId))}>Unpublish</button>
          <button type="button" className="button button-secondary" onClick={() => action(() => archiveAdminAssignment(assignmentId).then(() => navigate('/admin/assessments')))}>Archive</button>
        </div>
      </section>
    </main>
  )
}

export default AdminAssignmentReview
