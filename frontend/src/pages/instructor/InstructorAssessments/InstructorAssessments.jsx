import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Search, PlusCircle, FileText, CheckCircle2, Clock3, Archive } from 'lucide-react'
import { fetchInstructorCourse } from '../../../services/instructorService.js'
import { fetchCourseAssessments, archiveInstructorQuiz, archiveInstructorAssignment } from '../../../services/instructorAssessmentService.js'
import './InstructorAssessments.css'

const defaultFilters = { search: '', type: 'all', reviewStatus: 'all', publicationStatus: 'all' }

function InstructorAssessments() {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [filters, setFilters] = useState(defaultFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const [courseData, assessmentData] = await Promise.all([
        fetchInstructorCourse(courseId),
        fetchCourseAssessments(courseId, filters)
      ])
      setCourse(courseData?.course ?? null)
      setAssessments(assessmentData?.assessments ?? [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load course assessments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!courseId) return
    load()
  }, [courseId, filters.search, filters.type, filters.reviewStatus, filters.publicationStatus])

  const summary = useMemo(() => ({
    quizzes: assessments.filter((item) => item.type === 'quiz').length,
    assignments: assessments.filter((item) => item.type === 'assignment').length,
    draft: assessments.filter((item) => item.publicationStatus === 'draft').length,
    pendingReview: assessments.filter((item) => item.reviewStatus === 'pending').length,
    published: assessments.filter((item) => item.publicationStatus === 'published').length
  }), [assessments])

  const archiveAssessment = async (assessment) => {
    if (!window.confirm(`Archive this ${assessment.type}?`)) return
    try {
      if (assessment.type === 'quiz') await archiveInstructorQuiz(courseId, assessment.id)
      else await archiveInstructorAssignment(courseId, assessment.id)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to archive assessment.')
    }
  }

  return (
    <main className="assessment-page">
      <header className="assessment-header">
        <div>
          <p className="admin-kicker">COURSE ASSESSMENTS</p>
          <h1>{course?.title ?? 'Course assessments'}</h1>
          <p className="assessment-subtitle">Create and manage quizzes and assignments for this course.</p>
        </div>
        <div className="assessment-header-actions">
          <Link className="button button-secondary" to={`/instructor/courses/${courseId}/quizzes/new`}><PlusCircle size={16} /> Create Quiz</Link>
          <Link className="button button-primary" to={`/instructor/courses/${courseId}/assignments/new`}><FileText size={16} /> Create Assignment</Link>
        </div>
      </header>

      <section className="assessment-summary-grid" aria-label="Assessment summary">
        <article><span>Quiz count</span><strong>{summary.quizzes}</strong></article>
        <article><span>Assignment count</span><strong>{summary.assignments}</strong></article>
        <article><span>Draft</span><strong>{summary.draft}</strong></article>
        <article><span>Pending review</span><strong>{summary.pendingReview}</strong></article>
        <article><span>Published</span><strong>{summary.published}</strong></article>
      </section>

      <section className="admin-filters assessment-filters">
        <label>
          <Search size={16} />
          <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search assessments" />
        </label>
        <label>
          Type
          <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
            <option value="all">All</option>
            <option value="quiz">Quiz</option>
            <option value="assignment">Assignment</option>
          </select>
        </label>
        <label>
          Review status
          <select value={filters.reviewStatus} onChange={(event) => setFilters((current) => ({ ...current, reviewStatus: event.target.value }))}>
            <option value="all">All</option>
            <option value="not_submitted">Not submitted</option>
            <option value="pending">Pending</option>
            <option value="changes_requested">Changes requested</option>
            <option value="approved">Approved</option>
          </select>
        </label>
        <label>
          Publication status
          <select value={filters.publicationStatus} onChange={(event) => setFilters((current) => ({ ...current, publicationStatus: event.target.value }))}>
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </section>

      {loading && <p className="admin-state">Loading assessments...</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      {!loading && !error && (
        assessments.length === 0 ? (
          <div className="assessment-empty-state">
            <p>No assessments created yet</p>
            <span>Create a quiz or assignment for this course.</span>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Total marks</th>
                  <th>Questions</th>
                  <th>Review</th>
                  <th>Publication</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment) => (
                  <tr key={`${assessment.type}-${assessment.id}`}>
                    <td><strong>{assessment.title}</strong></td>
                    <td>{assessment.type === 'quiz' ? 'Quiz' : 'Assignment'}</td>
                    <td>{assessment.type === 'quiz' ? (assessment.totalMarks ?? 0) : (assessment.maximumMarks ?? 0)}</td>
                    <td>{assessment.type === 'quiz' ? (assessment.questions?.length ?? 0) : '-'}</td>
                    <td>{assessment.reviewStatus}</td>
                    <td>{assessment.publicationStatus}</td>
                    <td>{assessment.updatedAt ? new Date(assessment.updatedAt).toLocaleDateString() : '-'}</td>
                    <td className="admin-actions">
                      <Link to={assessment.type === 'quiz' ? `/instructor/courses/${courseId}/quizzes/${assessment.id}/edit` : `/instructor/courses/${courseId}/assignments/${assessment.id}/edit`} aria-label={`Edit ${assessment.title}`}><CheckCircle2 size={16} /></Link>
                      {['draft', 'changes_requested'].includes(assessment.publicationStatus) && (
                        <button type="button" onClick={() => archiveAssessment(assessment)} aria-label={`Archive ${assessment.title}`}>
                          <Archive size={16} />
                        </button>
                      )}
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

export default InstructorAssessments
