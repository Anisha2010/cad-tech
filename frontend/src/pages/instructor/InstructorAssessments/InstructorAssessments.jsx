import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Archive, ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, Eye, FileQuestion, FileText, Layers3, Plus, RotateCcw, Search, Send, X } from 'lucide-react'
import { fetchInstructorCourse, fetchInstructorCourses } from '../../../services/instructorService.js'
import { archiveInstructorAssignment, archiveInstructorQuiz, fetchCourseAssessments, submitInstructorAssignmentForReview, submitInstructorQuizForReview } from '../../../services/instructorAssessmentService.js'
import './InstructorAssessments.css'

const defaultFilters = { search: '', type: 'all', reviewStatus: 'all', publicationStatus: 'all' }

const statusLabels = {
  draft: 'Draft',
  pending: 'Pending Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  published: 'Published',
  unpublished: 'Unpublished',
  archived: 'Archived',
  not_submitted: 'Draft'
}

function getAssessmentStatus(assessment) {
  if (assessment.publicationStatus === 'archived') return 'archived'
  if (assessment.publicationStatus === 'published') return 'published'
  if (assessment.reviewStatus === 'pending') return 'pending'
  if (assessment.reviewStatus === 'changes_requested') return 'changes_requested'
  if (assessment.reviewStatus === 'approved') return 'approved'
  return assessment.publicationStatus || 'draft'
}

function StatusBadge({ status }) {
  const normalized = status || 'draft'
  return <span className={`instructor-assessment-status is-${normalized}`}>{statusLabels[normalized] || normalized.replaceAll('_', ' ')}</span>
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  return (
    <article className="instructor-assessment-summary-card">
      <span className={`instructor-assessment-summary-icon is-${tone}`}><Icon size={18} aria-hidden="true" /></span>
      <span className="instructor-assessment-summary-label">{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function InstructorAssessments() {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [assignedCourses, setAssignedCourses] = useState([])
  const [assessments, setAssessments] = useState([])
  const [filters, setFilters] = useState(defaultFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  const [actionPending, setActionPending] = useState(false)
  const archiveDialogRef = useRef(null)
  const previewDialogRef = useRef(null)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      if (!courseId) {
        const result = await fetchInstructorCourses({ status: 'all', reviewStatus: 'all' })
        setAssignedCourses(result?.courses ?? [])
        setCourse(null)
        setAssessments([])
        return
      }

      const [courseData, assessmentData] = await Promise.all([
        fetchInstructorCourse(courseId),
        fetchCourseAssessments(courseId, filters)
      ])
      setCourse(courseData?.course ?? null)
      setAssessments(assessmentData?.assessments ?? [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load assessments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [courseId, filters.search, filters.type, filters.reviewStatus, filters.publicationStatus])

  const summary = useMemo(() => ({
    quizzes: assessments.filter((item) => item.type === 'quiz').length,
    draft: assessments.filter((item) => item.publicationStatus === 'draft').length,
    pendingReview: assessments.filter((item) => item.reviewStatus === 'pending').length,
    published: assessments.filter((item) => item.publicationStatus === 'published').length
  }), [assessments])

  const confirmArchive = async () => {
    const assessment = selectedAssessment
    if (!assessment) return
    archiveDialogRef.current?.close()
    setActionPending(true)
    try {
      if (assessment.type === 'quiz') await archiveInstructorQuiz(courseId, assessment.id)
      else await archiveInstructorAssignment(courseId, assessment.id)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to archive assessment.')
    } finally {
      setActionPending(false)
      setSelectedAssessment(null)
    }
  }

  const submitForReview = async (assessment) => {
    setActionPending(true)
    setError('')
    try {
      if (assessment.type === 'quiz') await submitInstructorQuizForReview(courseId, assessment.id)
      else await submitInstructorAssignmentForReview(courseId, assessment.id)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit assessment for review.')
    } finally {
      setActionPending(false)
    }
  }

  const openArchiveDialog = (assessment) => {
    setSelectedAssessment(assessment)
    archiveDialogRef.current?.showModal()
  }

  const openPreviewDialog = (assessment) => {
    setSelectedAssessment(assessment)
    previewDialogRef.current?.showModal()
  }

  const changeStatusFilter = (status) => {
    if (status === 'all') {
      setFilters((current) => ({ ...current, reviewStatus: 'all', publicationStatus: 'all' }))
    } else if (status === 'draft') {
      setFilters((current) => ({ ...current, reviewStatus: 'not_submitted', publicationStatus: 'draft' }))
    } else if (status === 'unpublished') {
      setFilters((current) => ({ ...current, reviewStatus: 'approved', publicationStatus: 'draft' }))
    } else if (['published', 'archived'].includes(status)) {
      setFilters((current) => ({ ...current, reviewStatus: 'all', publicationStatus: status }))
    } else {
      setFilters((current) => ({ ...current, reviewStatus: status, publicationStatus: 'all' }))
    }
  }

  const selectedStatus = filters.reviewStatus === 'approved' && filters.publicationStatus === 'draft'
    ? 'unpublished'
    : filters.reviewStatus === 'not_submitted' && filters.publicationStatus === 'draft'
      ? 'draft'
      : filters.publicationStatus !== 'all' ? filters.publicationStatus : filters.reviewStatus

  if (!courseId) {
    return (
      <main className="instructor-assessments-page">
        <header className="instructor-assessments-header">
          <div>
            <p className="admin-kicker">ASSESSMENT MANAGEMENT</p>
            <h1>Assessments</h1>
            <p className="instructor-assessments-subtitle">Select a course to manage its quizzes and assignments.</p>
          </div>
        </header>

        {error && <div className="instructor-assessments-error" role="alert"><p>{error}</p><button type="button" onClick={load}><RotateCcw size={16} /> Retry</button></div>}
        {loading && <div className="instructor-assessments-loading" aria-label="Loading assigned courses"><span /><span /><span /></div>}
        {!loading && !error && assignedCourses.length === 0 && (
          <div className="instructor-assessments-empty">
            <ClipboardList size={28} aria-hidden="true" />
            <h2>No assigned courses</h2>
            <p>An administrator must assign a course before you can create assessments.</p>
          </div>
        )}
        {!loading && !error && assignedCourses.length > 0 && (
          <div className="instructor-assessment-table-wrap">
            <table className="instructor-assessment-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Software</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignedCourses.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Course"><strong>{item.title}</strong></td>
                    <td data-label="Software">{item.software}</td>
                    <td data-label="Actions" className="instructor-assessment-row-actions">
                      <Link className="instructor-assessment-link-button" to={`/instructor/courses/${item.id}/assessments`}>Manage Assessments <ArrowLeft size={15} aria-hidden="true" /></Link>
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

  return (
    <main className="instructor-assessments-page">
      <nav className="instructor-assessments-breadcrumb" aria-label="Breadcrumb">
        <Link to="/instructor/courses">My Courses</Link><span aria-hidden="true">/</span>
        <span>{course?.title || 'Course'}</span><span aria-hidden="true">/</span><span aria-current="page">Assessments</span>
      </nav>
      <header className="instructor-assessments-header">
        <div>
          <p className="admin-kicker">ASSESSMENT MANAGEMENT</p>
          <h1>{course?.title ?? 'Course assessments'}</h1>
          <p className="instructor-assessments-subtitle">Create, review, and manage quizzes and assignments for this course.</p>
        </div>
        <div className="instructor-assessment-header-actions">
          <Link className="instructor-assessment-button is-primary" to={`/instructor/courses/${courseId}/quizzes/new`}><Plus size={17} aria-hidden="true" /> Add Quiz</Link>
          <Link className="instructor-assessment-button is-secondary" to={`/instructor/courses/${courseId}/assignments/new`}><FileText size={17} aria-hidden="true" /> Add Assignment</Link>
        </div>
      </header>

      <section className="instructor-assessment-summary-grid" aria-label="Assessment summary">
        <SummaryCard icon={Layers3} label="Total Quizzes" value={loading ? '—' : summary.quizzes} tone="blue" />
        <SummaryCard icon={FileQuestion} label="Draft" value={loading ? '—' : summary.draft} tone="slate" />
        <SummaryCard icon={CalendarDays} label="Pending Review" value={loading ? '—' : summary.pendingReview} tone="amber" />
        <SummaryCard icon={CheckCircle2} label="Published" value={loading ? '—' : summary.published} tone="green" />
      </section>

      <section className="instructor-assessment-filters" aria-label="Filter assessments">
        <label className="instructor-assessment-search">
          <span>Search assessments</span>
          <span className="instructor-assessment-search-input"><Search size={16} aria-hidden="true" /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search by title" /></span>
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
          Status
          <select value={selectedStatus} onChange={(event) => changeStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending Review</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button type="button" className="instructor-assessment-clear" onClick={() => setFilters(defaultFilters)}>Clear filters</button>
      </section>

      {loading && <div className="instructor-assessments-loading" aria-label="Loading assessments"><span /><span /><span /></div>}
      {error && <div className="instructor-assessments-error" role="alert"><p>Unable to load assessments.</p><div><button type="button" onClick={load}><RotateCcw size={16} /> Retry</button><Link to="/instructor/courses"><ArrowLeft size={16} /> Back to My Courses</Link></div></div>}

      {!loading && !error && (
        assessments.length === 0 ? (
          <div className="instructor-assessments-empty">
            <span className="instructor-assessments-empty-icon"><ClipboardList size={25} aria-hidden="true" /></span>
            <h2>No assessments created yet</h2>
            <p>Create your first quiz or assignment for this course and submit it for admin review.</p>
            <div className="instructor-assessment-header-actions">
              <Link className="instructor-assessment-button is-primary" to={`/instructor/courses/${courseId}/quizzes/new`}><Plus size={17} aria-hidden="true" /> Add Quiz</Link>
              <Link className="instructor-assessment-button is-secondary" to={`/instructor/courses/${courseId}/assignments/new`}><FileText size={17} aria-hidden="true" /> Add Assignment</Link>
            </div>
          </div>
        ) : (
          <div className="instructor-assessment-table-wrap">
            <table className="instructor-assessment-table">
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Type</th>
                  <th>Questions</th>
                  <th>Total Marks</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment) => (
                  <tr key={`${assessment.type}-${assessment.id}`}>
                    <td data-label="Assessment"><strong>{assessment.title}</strong>{(assessment.lessonTitle || assessment.lesson?.title) && <small>{assessment.lessonTitle || assessment.lesson.title}</small>}</td>
                    <td data-label="Type"><span className={`instructor-assessment-type is-${assessment.type}`}>{assessment.type === 'quiz' ? 'Quiz' : 'Assignment'}</span></td>
                    <td data-label="Questions">{assessment.type === 'quiz' ? (assessment.questions?.length ?? 0) : '—'}</td>
                    <td data-label="Total Marks">{assessment.type === 'quiz' ? (assessment.totalMarks ?? 0) : (assessment.maximumMarks ?? 0)}</td>
                    <td data-label="Status"><StatusBadge status={getAssessmentStatus(assessment)} /></td>
                    <td data-label="Updated">{assessment.updatedAt ? new Date(assessment.updatedAt).toLocaleDateString() : '—'}</td>
                    <td data-label="Actions" className="instructor-assessment-row-actions">
                      {['draft', 'changes_requested'].includes(getAssessmentStatus(assessment)) && <Link className="instructor-assessment-icon-action" to={assessment.type === 'quiz' ? `/instructor/courses/${courseId}/quizzes/${assessment.id}/edit` : `/instructor/courses/${courseId}/assignments/${assessment.id}/edit`} aria-label={`Edit ${assessment.title}`} title="Edit"><CheckCircle2 size={17} /></Link>}
                      <button className="instructor-assessment-icon-action" type="button" onClick={() => openPreviewDialog(assessment)} aria-label={`Preview ${assessment.title}`} title="Preview"><Eye size={17} /></button>
                      {!['pending', 'approved', 'published', 'archived'].includes(getAssessmentStatus(assessment)) && (
                        <button className="instructor-assessment-icon-action is-submit" type="button" onClick={() => submitForReview(assessment)} disabled={actionPending} aria-label={`Submit ${assessment.title} for review`} title="Submit for review"><Send size={16} /></button>
                      )}
                      {['draft', 'changes_requested'].includes(getAssessmentStatus(assessment)) && (
                        <button className="instructor-assessment-icon-action is-danger" type="button" onClick={() => openArchiveDialog(assessment)} aria-label={`Archive ${assessment.title}`} title="Archive"><Archive size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <dialog className="instructor-assessment-dialog" ref={archiveDialogRef} onClick={(event) => { if (event.target === archiveDialogRef.current) archiveDialogRef.current.close() }}>
        <div className="instructor-assessment-dialog-heading"><span className="is-danger"><Archive size={19} aria-hidden="true" /></span><button type="button" aria-label="Close archive confirmation" onClick={() => archiveDialogRef.current?.close()}><X size={18} /></button></div>
        <h2>Archive assessment?</h2>
        <p><strong>{selectedAssessment?.title}</strong> will be moved to archived assessments.</p>
        <div className="instructor-assessment-dialog-actions"><button type="button" className="instructor-assessment-button is-secondary" onClick={() => archiveDialogRef.current?.close()}>Cancel</button><button type="button" className="instructor-assessment-button is-danger" onClick={confirmArchive} disabled={actionPending}>{actionPending ? 'Archiving...' : 'Archive'}</button></div>
      </dialog>

      <dialog className="instructor-assessment-dialog instructor-assessment-preview" ref={previewDialogRef} onClick={(event) => { if (event.target === previewDialogRef.current) previewDialogRef.current.close() }}>
        <div className="instructor-assessment-dialog-heading"><span><Eye size={19} aria-hidden="true" /></span><button type="button" aria-label="Close preview" onClick={() => previewDialogRef.current?.close()}><X size={18} /></button></div>
        <p className="admin-kicker">{selectedAssessment?.type === 'quiz' ? 'QUIZ PREVIEW' : 'ASSIGNMENT PREVIEW'}</p>
        <h2>{selectedAssessment?.title}</h2>
        <div className="instructor-assessment-preview-meta"><StatusBadge status={selectedAssessment ? getAssessmentStatus(selectedAssessment) : 'draft'} /><span>{selectedAssessment?.type === 'quiz' ? `${selectedAssessment.questions?.length ?? 0} questions` : `${selectedAssessment?.maximumMarks ?? 0} marks`}</span></div>
        <p>{selectedAssessment?.instructions || selectedAssessment?.description || 'No instructions have been added.'}</p>
        {selectedAssessment?.type === 'quiz' && Array.isArray(selectedAssessment.questions) && <ol className="instructor-assessment-preview-questions">{selectedAssessment.questions.map((question, index) => <li key={question.id || index}><strong>{question.prompt || `Question ${index + 1}`}</strong><span>{question.marks ?? 0} marks</span></li>)}</ol>}
        <div className="instructor-assessment-dialog-actions"><button type="button" className="instructor-assessment-button is-primary" onClick={() => previewDialogRef.current?.close()}>Done</button></div>
      </dialog>
    </main>
  )
}

export default InstructorAssessments
