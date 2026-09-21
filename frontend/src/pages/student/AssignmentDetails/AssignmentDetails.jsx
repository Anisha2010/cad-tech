import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Save, Send } from 'lucide-react'
import { createStudentSubmissionDraft, getStudentAssignment, removeStudentSubmissionAttachment, submitStudentSubmission, updateStudentSubmission, uploadStudentSubmissionAttachment } from '../../../services/studentAssignmentService.js'
import './AssignmentDetails.css'

function formatDate(dateValue) {
  if (!dateValue) return 'No due date'
  return new Date(dateValue).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
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

function AssignmentDetails() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [textAnswer, setTextAnswer] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const currentDraftId = useMemo(() => submission?.id || null, [submission])

  const loadAssignment = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getStudentAssignment(assignmentId)
      setAssignment(result.assignment)
      setSubmission(result.currentDraft || null)
      setTextAnswer(result.currentDraft?.textAnswer || '')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load assignment details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (assignmentId) {
      loadAssignment()
    }
  }, [assignmentId])

  const handleSaveDraft = async () => {
    try {
      setSaving(true)
      setError('')
      setMessage('')
      let activeSubmission = submission
      if (!activeSubmission) {
        activeSubmission = await createStudentSubmissionDraft(assignmentId)
        setSubmission(activeSubmission)
      }

      const updated = await updateStudentSubmission(activeSubmission.id, { textAnswer })
      setSubmission(updated)
      setMessage('Draft saved successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save your draft.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async () => {
    if (!file || !currentDraftId) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      setUploading(true)
      setError('')
      setMessage('')
      const result = await uploadStudentSubmissionAttachment(currentDraftId, formData)
      setSubmission(result)
      setMessage('File uploaded successfully.')
      setFile(null)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to upload this file.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAttachment = async (attachmentId) => {
    if (!currentDraftId) return
    try {
      setError('')
      const result = await removeStudentSubmissionAttachment(currentDraftId, attachmentId)
      setSubmission(result)
      setMessage('Attachment removed.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to remove this attachment.')
    }
  }

  const handleSubmit = async () => {
    if (!currentDraftId) return
    try {
      setSubmitting(true)
      setError('')
      setMessage('')
      const confirmed = window.confirm('Submit assignment?\nYou will not be able to edit this revision after submission.')
      if (!confirmed) return
      const result = await submitStudentSubmission(currentDraftId)
      setSubmission(result)
      setMessage('Assignment submitted successfully.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit this assignment.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <main className="student-content-area"><div className="dashboard-skeleton" role="status" aria-live="polite">Loading assignment…</div></main>
  }

  if (error && !assignment) {
    return <main className="student-content-area"><div className="dashboard-error" role="alert"><div><strong>{error}</strong></div></div></main>
  }

  const allowedTypes = assignment?.allowedSubmissionTypes || []

  return (
    <main className="student-content-area assignment-details-page">
      <div className="page-header-row">
        <Link to="/student/submissions" className="button button-secondary"><ArrowLeft size={16} /> Back</Link>
        <div>
          <p className="welcome-kicker">Assignment</p>
          <h1>{assignment?.title || 'Assignment'}</h1>
        </div>
      </div>

      {message && <div className="assessment-success" aria-live="polite">{message}</div>}
      {error && <div className="admin-error" role="alert">{error}</div>}

      <section className="student-panel assignment-summary-panel">
        <h2>{assignment?.courseTitle}</h2>
        <p>{assignment?.instructions}</p>
        <div className="assignment-meta-grid">
          <div><strong>Maximum Marks</strong><span>{assignment?.maximumMarks || 0}</span></div>
          <div><strong>Due Date</strong><span>{formatDate(assignment?.dueDate)}</span></div>
          <div><strong>Late Policy</strong><span>{assignment?.allowLateSubmissions ? 'Late submissions allowed' : 'Late submissions not allowed'}</span></div>
          <div><strong>Submission Types</strong><span>{allowedTypes.join(', ') || 'Not specified'}</span></div>
        </div>
      </section>

      <section className="student-panel assignment-editor-panel">
        <h3>Submission</h3>
        {allowedTypes.includes('text') && (
          <label className="assignment-field">
            <span>Answer</span>
            <textarea value={textAnswer} rows={10} onChange={(event) => setTextAnswer(event.target.value)} placeholder="Write your response here" />
          </label>
        )}

        {allowedTypes.some((type) => type !== 'text') && (
          <div className="assignment-upload-block">
            <label className="assignment-field">
              <span>Upload file</span>
              <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </label>
            {file && (
              <div className="upload-controls">
                <span>{file.name}</span>
                <button type="button" className="button button-primary" onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Upload file'}
                </button>
              </div>
            )}
          </div>
        )}

        {submission?.attachments?.length ? (
          <div className="assignment-files-list">
            <h4>Uploaded attachments</h4>
            {submission.attachments.map((attachment) => (
              <div className="assignment-file-item" key={attachment.id}>
                <div>
                  <FileText size={16} />
                  <a href={attachment.url} target="_blank" rel="noreferrer noopener">{attachment.originalName || 'Attachment'}</a>
                </div>
                <button type="button" className="button button-secondary" onClick={() => handleRemoveAttachment(attachment.id)}>Remove</button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="assignment-actions">
          <button type="button" className="button button-secondary" onClick={handleSaveDraft} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button type="button" className="button button-primary" onClick={handleSubmit} disabled={submitting || !currentDraftId}>
            <Send size={16} /> {submitting ? 'Submitting…' : 'Submit Assignment'}
          </button>
        </div>
        {submission && (
          <div className="submission-status-pill" aria-live="polite">
            Status: <strong>{statusLabel(submission.status)}</strong>
          </div>
        )}
      </section>
    </main>
  )
}

export default AssignmentDetails
