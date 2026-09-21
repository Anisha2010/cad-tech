import { ArrowLeft, Save, SendToBack } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchInstructorCourse, submitCourseForReview, updateInstructorCourse } from '../../services/instructorService.js'
import './InstructorCourseForm.css'

const emptyForm = {
  title: '',
  shortDescription: '',
  description: '',
  category: '',
  software: '',
  level: 'Beginner',
  duration: '',
  thumbnailUrl: '',
  learningOutcomes: '',
  requirements: ''
}

function InstructorCourseForm() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [course, setCourse] = useState(null)

  useEffect(() => {
    if (!courseId) return

    fetchInstructorCourse(courseId)
      .then((result) => {
        setCourse(result)
        setForm({
          title: result.title || '',
          shortDescription: result.shortDescription || '',
          description: result.description || '',
          category: result.category || '',
          software: result.software || '',
          level: result.level || 'Beginner',
          duration: result.duration || '',
          thumbnailUrl: result.thumbnailUrl || '',
          learningOutcomes: Array.isArray(result.learningOutcomes) ? result.learningOutcomes.join('\n') : '',
          requirements: Array.isArray(result.requirements) ? result.requirements.join('\n') : ''
        })
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message || 'Unable to load course.')
      })
      .finally(() => setLoading(false))
  }, [courseId])

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        title: form.title,
        shortDescription: form.shortDescription,
        description: form.description,
        category: form.category,
        software: form.software,
        level: form.level,
        duration: form.duration || null,
        thumbnailUrl: form.thumbnailUrl || null,
        learningOutcomes: form.learningOutcomes.split('\n').map((entry) => entry.trim()).filter(Boolean),
        requirements: form.requirements.split('\n').map((entry) => entry.trim()).filter(Boolean)
      }
      await updateInstructorCourse(courseId, payload)
      navigate('/instructor/courses')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save course.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitForReview = async () => {
    setSaving(true)
    setError('')
    try {
      await submitCourseForReview(courseId)
      navigate('/instructor/courses')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit for review.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="instructor-course-page"><p className="admin-state">Loading course...</p></main>

  return (
    <main className="instructor-course-page">
      <header className="instructor-course-header">
        <div className="instructor-course-header-content">
          <p className="admin-kicker">COURSE EDITOR</p>
          <h1>{course?.title || 'Course Details'}</h1>
          <p>Update your course content and submit it for admin review.</p>
        </div>
        <div className="instructor-form-actions">
          <Link className="button button-outline" to="/instructor/courses"><ArrowLeft size={17} /> Back</Link>
        </div>
      </header>

      {error && <p className="admin-error" role="alert">{error}</p>}

      <section className="instructor-course-card">
        <form className="instructor-course-form" onSubmit={onSubmit}>
          <div className="instructor-course-section">
            <h2 className="instructor-course-section-header">Course overview</h2>
            <div className="instructor-form-grid">
              <div className="instructor-field">
                <label htmlFor="course-title">Course title</label>
                <input id="course-title" value={form.title} onChange={(event) => updateField('title', event.target.value)} required />
              </div>
              <div className="instructor-field">
                <label htmlFor="course-category">Category</label>
                <input id="course-category" value={form.category} onChange={(event) => updateField('category', event.target.value)} required />
              </div>
              <div className="instructor-field">
                <label htmlFor="course-software">Software</label>
                <input id="course-software" value={form.software} onChange={(event) => updateField('software', event.target.value)} required />
              </div>
              <div className="instructor-field">
                <label htmlFor="course-level">Level</label>
                <select id="course-level" value={form.level} onChange={(event) => updateField('level', event.target.value)}>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
              <div className="instructor-field">
                <label htmlFor="course-duration">Duration</label>
                <input id="course-duration" value={form.duration} onChange={(event) => updateField('duration', event.target.value)} placeholder="e.g. 8 weeks" />
              </div>
              <div className="instructor-field">
                <label htmlFor="course-thumbnail">Thumbnail URL</label>
                <input id="course-thumbnail" value={form.thumbnailUrl} onChange={(event) => updateField('thumbnailUrl', event.target.value)} />
              </div>
              <div className="instructor-field full-width">
                <label htmlFor="course-short-description">Short description</label>
                <textarea id="course-short-description" rows="3" value={form.shortDescription} onChange={(event) => updateField('shortDescription', event.target.value)} required />
              </div>
            </div>
          </div>

          <div className="instructor-course-section">
            <h2 className="instructor-course-section-header">Course details</h2>
            <div className="instructor-form-grid">
              <div className="instructor-field full-width">
                <label htmlFor="course-description">Course description</label>
                <textarea id="course-description" className="large" rows="6" value={form.description} onChange={(event) => updateField('description', event.target.value)} required />
              </div>
              <div className="instructor-field full-width">
                <label htmlFor="course-learning-outcomes">Learning outcomes</label>
                <textarea id="course-learning-outcomes" rows="5" value={form.learningOutcomes} onChange={(event) => updateField('learningOutcomes', event.target.value)} placeholder="One per line" />
              </div>
              <div className="instructor-field full-width">
                <label htmlFor="course-requirements">Requirements</label>
                <textarea id="course-requirements" rows="5" value={form.requirements} onChange={(event) => updateField('requirements', event.target.value)} placeholder="One per line" />
              </div>
            </div>
          </div>

          <div className="instructor-form-actions">
            <button className="button button-primary" type="submit" disabled={saving}><Save size={17} /> {saving ? 'Saving...' : 'Save Changes'}</button>
            <button className="button button-outline" type="button" disabled={saving || !courseId} onClick={handleSubmitForReview}><SendToBack size={17} /> Submit for Review</button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default InstructorCourseForm
