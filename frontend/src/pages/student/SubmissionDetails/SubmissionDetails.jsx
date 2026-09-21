import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, FileText } from 'lucide-react'
import { getStudentSubmissionDetail } from '../../../services/studentAssignmentService.js'
import './SubmissionDetails.css'

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

function SubmissionDetails() {
  const { submissionId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!submissionId) return
    setLoading(true)
    setError('')
    getStudentSubmissionDetail(submissionId)
      .then((result) => setData(result))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load submission.'))
      .finally(() => setLoading(false))
  }, [submissionId])

  if (loading) {
    return <main className="student-content-area"><div className="dashboard-skeleton" role="status" aria-live="polite">Loading submission details…</div></main>
  }

  if (error) {
    return <main className="student-content-area"><div className="dashboard-error" role="alert"><div><strong>{error}</strong></div></div></main>
  }

  const submission = data?.submission
  const assignment = data?.assignment

  return (
    <main className="student-content-area">
      <div className="page-header-row">
        <Link to="/student/submissions" className="button button-secondary"><ArrowLeft size={16} /> Back</Link>
        <div>
          <p className="welcome-kicker">Submission</p>
          <h1>{assignment?.title || 'Submission'}</h1>
        </div>
      </div>

      <section className="student-panel submission-detail-panel">
        <div className="submission-detail-header">
          <span className="submission-status-badge">{statusLabel(submission?.status)}</span>
          <span className="revision-pill">Revision {submission?.revisionNumber}</span>
        </div>

        <div className="submission-detail-grid">
          <div><strong>Submitted</strong><span>{formatDate(submission?.submittedAt)}</span></div>
          <div><strong>Late</strong><span>{submission?.isLate ? 'Yes' : 'No'}</span></div>
          <div><strong>Marks</strong><span>{submission?.marksAwarded !== null && submission?.marksAwarded !== undefined ? `${submission.marksAwarded}/${assignment?.maximumMarks || submission.maximumMarksSnapshot || 0}` : 'Pending'}</span></div>
          <div><strong>Course</strong><span>{assignment?.courseTitle || 'Course'}</span></div>
        </div>

        <div className="submission-section">
          <h3>Submitted text</h3>
          <div className="submission-text-box">{submission?.textAnswer || 'No text was submitted.'}</div>
        </div>

        {submission?.attachments?.length ? (
          <div className="submission-section">
            <h3>Attachments</h3>
            <ul className="attachment-list">
              {submission.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <FileText size={16} />
                  <a href={attachment.url} target="_blank" rel="noopener noreferrer">{attachment.originalName || 'Attachment'}</a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {submission?.feedback && (
          <div className="submission-section">
            <h3>Instructor feedback</h3>
            <div className="submission-text-box">{submission.feedback}</div>
          </div>
        )}

        {submission?.resubmissionReason && (
          <div className="submission-section">
            <h3>Resubmission reason</h3>
            <div className="submission-text-box">{submission.resubmissionReason}</div>
          </div>
        )}

        {submission?.status === 'resubmission_requested' && (
          <Link className="button button-primary" to={`/student/assignments/${assignment?.id}`}><CheckCircle2 size={16} /> Resubmit assignment</Link>
        )}
      </section>
    </main>
  )
}

export default SubmissionDetails
