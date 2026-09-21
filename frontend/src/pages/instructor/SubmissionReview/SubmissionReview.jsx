import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { getInstructorSubmission, gradeInstructorSubmission, requestSubmissionResubmission } from '../../../services/instructorSubmissionService.js'
import './SubmissionReview.css'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function SubmissionReview() {
  const { submissionId } = useParams()
  const [data, setData] = useState(null)
  const [marksAwarded, setMarksAwarded] = useState('')
  const [feedback, setFeedback] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadSubmission = () => {
    setLoading(true)
    setError('')
    getInstructorSubmission(submissionId)
      .then((result) => {
        setData(result)
        setMarksAwarded(result?.submission?.marksAwarded ?? '')
        setFeedback(result?.submission?.feedback || '')
      })
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load submission.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (submissionId) loadSubmission()
  }, [submissionId])

  const handleGrade = async () => {
    setError('')
    setMessage('')
    try {
      const result = await gradeInstructorSubmission(submissionId, { marksAwarded: Number(marksAwarded), feedback })
      setData((current) => ({ ...current, submission: result }))
      setMessage('Submission graded successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to grade submission.')
    }
  }

  const handleRequestResubmission = async () => {
    setError('')
    setMessage('')
    try {
      const result = await requestSubmissionResubmission(submissionId, { reason })
      setData((current) => ({ ...current, submission: result }))
      setMessage('Resubmission requested.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to request a resubmission.')
    }
  }

  if (loading) {
    return <main className="instructor-content-page"><div className="dashboard-skeleton" role="status" aria-live="polite">Loading review…</div></main>
  }

  const submission = data?.submission
  const assignment = data?.assignment

  return (
    <main className="instructor-content-page review-page">
      <div className="page-header-row">
        <Link to="/instructor/courses" className="button button-secondary"><ArrowLeft size={16} /> Back</Link>
        <div>
          <p className="welcome-kicker">Submission Review</p>
          <h1>{assignment?.title || 'Assignment review'}</h1>
        </div>
      </div>

      {message && <div className="assessment-success" aria-live="polite">{message}</div>}
      {error && <div className="admin-error" role="alert">{error}</div>}

      <section className="student-panel review-detail-panel">
        <div className="review-meta-grid">
          <div><strong>Student</strong><span>{data?.student?.name || 'Student'}</span></div>
          <div><strong>Revision</strong><span>{submission?.revisionNumber}</span></div>
          <div><strong>Submitted</strong><span>{formatDate(submission?.submittedAt)}</span></div>
          <div><strong>Late</strong><span>{submission?.isLate ? 'Yes' : 'No'}</span></div>
          <div><strong>Maximum marks</strong><span>{assignment?.maximumMarks || 0}</span></div>
        </div>

        <div className="review-text-block">
          <h3>Submitted text</h3>
          <div className="submission-text-box">{submission?.textAnswer || 'No text submitted.'}</div>
        </div>

        {submission?.attachments?.length ? (
          <div className="review-text-block">
            <h3>Attachment files</h3>
            <ul className="attachment-list">
              {submission.attachments.map((attachment) => (
                <li key={attachment.id}><a href={attachment.url} target="_blank" rel="noopener noreferrer">{attachment.originalName || 'Attachment'}</a></li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grade-form-grid">
          <label>
            Marks awarded
            <input type="number" min="0" max={assignment?.maximumMarks || 100} value={marksAwarded} onChange={(event) => setMarksAwarded(event.target.value)} />
          </label>
          <label>
            Feedback
            <textarea rows={5} value={feedback} onChange={(event) => setFeedback(event.target.value)} />
          </label>
        </div>

        <div className="review-actions">
          <button type="button" className="button button-primary" onClick={handleGrade}><CheckCircle2 size={16} /> Grade submission</button>
        </div>

        <div className="resubmission-box">
          <label>
            Resubmission reason
            <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Please provide the resubmission reason" />
          </label>
          <button type="button" className="button button-secondary" onClick={handleRequestResubmission}>Request resubmission</button>
        </div>
      </section>
    </main>
  )
}

export default SubmissionReview
