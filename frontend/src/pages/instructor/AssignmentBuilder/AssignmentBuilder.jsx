import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Send } from 'lucide-react'
import { getInstructorAssignment, updateInstructorAssignment, createInstructorAssignment, submitInstructorAssignmentForReview } from '../../../services/instructorAssessmentService.js'
import './AssignmentBuilder.css'

function AssignmentBuilder() {
  const { courseId, assignmentId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '', instructions: '', maximumMarks: 100, dueDate: '', allowedSubmissionTypes: ['pdf'], resources: [{ title: '', url: '' }] })
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!courseId || !assignmentId || assignmentId === 'new') return
    const load = async () => {
      try {
        const response = await getInstructorAssignment(courseId, assignmentId)
        setForm({
          ...response.assessment,
          dueDate: response.assessment?.dueDate ? new Date(response.assessment.dueDate).toISOString().slice(0, 10) : '',
          allowedSubmissionTypes: response.assessment?.allowedSubmissionTypes?.length ? response.assessment.allowedSubmissionTypes : ['pdf'],
          resources: response.assessment?.resources?.length ? response.assessment.resources : [{ title: '', url: '' }]
        })
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load assignment.')
      }
    }
    load()
  }, [courseId, assignmentId])

  const saveDraft = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (assignmentId && assignmentId !== 'new') {
        const response = await updateInstructorAssignment(courseId, assignmentId, form)
        setForm({ ...form, ...response.assessment })
        setMessage('Assignment draft saved.')
      } else {
        const response = await createInstructorAssignment(courseId, form)
        setMessage('Assignment created.')
        navigate(`/instructor/courses/${courseId}/assignments/${response.assessment.id}/edit`, { replace: true })
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save assignment draft.')
    } finally {
      setSaving(false)
    }
  }

  const submitReview = async () => {
    if (!assignmentId || assignmentId === 'new') {
      setError('Create the assignment before submitting it for review.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const response = await submitInstructorAssignmentForReview(courseId, assignmentId)
      setForm({ ...form, ...response.assessment })
      setMessage('Assignment submitted for review.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit assignment for review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="assignment-builder-page">
      <header className="assessment-builder-header">
        <button type="button" className="button button-secondary" onClick={() => navigate(`/instructor/courses/${courseId}/assessments`)}><ArrowLeft size={16} /> Back</button>
        <div>
          <p className="admin-kicker">ASSIGNMENT BUILDER</p>
          <h1>{assignmentId && assignmentId !== 'new' ? 'Edit assignment' : 'New assignment'}</h1>
        </div>
      </header>

      {message && <p className="assessment-success" aria-live="polite">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <section className="assessment-builder-panel">
        <div className="assessment-form-grid">
          <label>
            Assignment title
            <input value={form.title || ''} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            Maximum marks
            <input type="number" min="1" value={form.maximumMarks || 100} onChange={(event) => setForm((current) => ({ ...current, maximumMarks: Number(event.target.value) || 1 }))} />
          </label>
          <label>
            Due date
            <input type="date" value={form.dueDate || ''} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
          </label>
          <label className="assessment-full-width">
            Description
            <textarea value={form.description || ''} rows={3} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label className="assessment-full-width">
            Instructions
            <textarea value={form.instructions || ''} rows={5} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} />
          </label>
          <label>
            Allowed submission types
            <select multiple value={form.allowedSubmissionTypes || ['pdf']} onChange={(event) => {
              const next = Array.from(event.target.selectedOptions, (option) => option.value)
              setForm((current) => ({ ...current, allowedSubmissionTypes: next }))
            }}>
              <option value="pdf">PDF</option>
              <option value="document">Document</option>
              <option value="image">Image</option>
              <option value="text">Text</option>
            </select>
          </label>
        </div>
      </section>

      <footer className="assessment-builder-actions">
        <button type="button" className="button button-secondary" onClick={saveDraft} disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}</button>
        <button type="button" className="button button-primary" onClick={submitReview} disabled={submitting}><Send size={16} /> {submitting ? 'Submitting...' : 'Submit for Review'}</button>
      </footer>
    </main>
  )
}

export default AssignmentBuilder
