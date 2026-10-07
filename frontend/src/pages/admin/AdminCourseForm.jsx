import { ArrowLeft, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { assignInstructor, createAdminCourse, fetchAdminCourseById, getInstructors, updateAdminCourse } from '../../services/adminCourseService.js'
import { uploadAdminCourseMedia } from '../../services/mediaUploadService.js'
import './AdminCourseForm.css'

const initial = {
  title: '', slug: '', shortDescription: '', description: '', category: '', software: '',
  level: '', duration: '', thumbnailUrl: '', priceInRupees: '', enrollmentOpen: false, status: 'draft'
}

const toPaise = (value) => {
  if (value === '') return null
  if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0) return NaN
  return Math.round(Number(value) * 100)
}

function AdminCourseForm() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [instructors, setInstructors] = useState([])
  const [instructorId, setInstructorId] = useState('')
  const [initialInstructorId, setInitialInstructorId] = useState('')
  const [instructorsLoading, setInstructorsLoading] = useState(false)
  const [instructorsError, setInstructorsError] = useState('')
  const [loading, setLoading] = useState(Boolean(courseId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [thumbnailUploading, setThumbnailUploading] = useState(false)

  const loadInstructors = async () => {
    setInstructorsLoading(true)
    setInstructorsError('')
    try {
      const response = await getInstructors()
      const nextInstructors = response?.instructors ?? []
      setInstructors(nextInstructors)
    } catch (requestError) {
      setInstructors([])
      setInstructorsError(requestError.response?.data?.message || 'Unable to load instructors.')
    } finally {
      setInstructorsLoading(false)
    }
  }

  useEffect(() => {
    loadInstructors()

    if (!courseId) return
    fetchAdminCourseById(courseId)
      .then(({ course }) => {
        const selectedInstructorId = course?.instructorId?._id ?? course?.instructorId?.id ?? course?.instructorId ?? course?.instructor?._id ?? course?.instructor?.id ?? ''
        setForm({ ...initial, ...course, priceInRupees: Number.isInteger(course.priceInPaise) ? (course.priceInPaise / 100).toFixed(2) : '' })
        setInstructorId(String(selectedInstructorId || ''))
        setInitialInstructorId(String(selectedInstructorId || ''))
      })
      .catch(() => setError('Unable to load this course.'))
      .finally(() => setLoading(false))
  }, [courseId])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleThumbnailUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFieldError('')
    setThumbnailUploading(true)
    try {
      const result = await uploadAdminCourseMedia('thumbnail', file)
      if (!result?.media?.url) throw new Error('The upload did not return a thumbnail URL.')
      update('thumbnailUrl', result.media.url)
    } catch (requestError) {
      setFieldError(requestError.response?.data?.message || requestError.message || 'Unable to upload thumbnail.')
    } finally {
      setThumbnailUploading(false)
      event.target.value = ''
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setFieldError('')
    setError('')
    const priceInPaise = toPaise(form.priceInRupees)
    if (!form.title.trim()) return setFieldError('Course title is required.')
    if (!form.software.trim()) return setFieldError('Software is required.')
    if (!form.level) return setFieldError('Please select a course level.')
    if (Number.isNaN(priceInPaise)) return setFieldError('Enter a valid course price.')
    if (form.enrollmentOpen && priceInPaise === null) return setFieldError('A valid price is required before opening enrollment.')

    setSaving(true)
    try {
      const payload = { ...form, priceInPaise, instructorId: instructorId || null }
      delete payload.priceInRupees

      if (courseId) {
        await updateAdminCourse(courseId, payload)
        const changedInstructor = String(instructorId || '') !== String(initialInstructorId || '')
        if (changedInstructor) {
          await assignInstructor(courseId, instructorId || null)
        }
      } else {
        const createdCourse = await createAdminCourse(payload)
        const nextCourseId = createdCourse?.course?.id || createdCourse?.id || createdCourse?.course?._id || createdCourse?._id
        if (nextCourseId && instructorId) {
          try {
            await assignInstructor(nextCourseId, instructorId)
          } catch (assignmentError) {
            setError('Course was created, but the instructor could not be assigned.')
            setSaving(false)
            return
          }
        }
      }

      navigate('/admin/courses', { replace: true, state: { notice: `Course ${courseId ? 'updated' : 'created'} successfully.` } })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save this course.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="admin-page"><p className="admin-state">Loading course...</p></main>

  return (
    <main className="admin-page admin-form-page">
      <Link className="admin-back-link" to="/admin/courses"><ArrowLeft size={16} /> Course Management</Link>
      <header className="admin-page-header"><div><p className="admin-kicker">{courseId ? 'EDIT COURSE' : 'NEW COURSE'}</p><h1>{courseId ? 'Edit Course' : 'Create Course'}</h1></div></header>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {fieldError && <p className="admin-error" role="alert">{fieldError}</p>}
      <form className="admin-course-form" onSubmit={submit}>
        <label>Course Title<input value={form.title} onChange={(event) => update('title', event.target.value)} /></label>
        <label>Slug<input value={form.slug} onChange={(event) => update('slug', event.target.value)} placeholder="Generated from title if empty" /></label>
        <label>Short Description<textarea rows="3" value={form.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} /></label>
        <label>Full Description<textarea rows="5" value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
        <div className="admin-form-grid">
          <label>Category<input value={form.category} onChange={(event) => update('category', event.target.value)} /></label>
          <label>Software<input value={form.software} onChange={(event) => update('software', event.target.value)} /></label>
          <label>Level<select value={form.level} onChange={(event) => update('level', event.target.value)}><option value="">Select level</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
          <label>Duration<input value={form.duration || ''} onChange={(event) => update('duration', event.target.value)} /></label>
          <label>Status<select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        </div>
        <label>Thumbnail URL<input type="url" value={form.thumbnailUrl || ''} onChange={(event) => update('thumbnailUrl', event.target.value)} /></label>
        <label>Upload thumbnail image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleThumbnailUpload} disabled={thumbnailUploading} />{thumbnailUploading && <span role="status">Uploading thumbnail...</span>}</label>
        <div className="admin-course-field">
          <label htmlFor="assigned-instructor">Assigned Instructor</label>
          <select id="assigned-instructor" name="instructorId" value={instructorId} onChange={(event) => setInstructorId(event.target.value)} disabled={instructorsLoading || saving}>
            <option value="">
              {instructorsLoading ? 'Loading instructors...' : instructors.length === 0 ? 'No instructor accounts available.' : 'Not assigned'}
            </option>
            {instructors.map((instructor) => (
              <option key={instructor.id || instructor._id} value={instructor.id || instructor._id}>
                {instructor.name}{instructor.email ? ` (${instructor.email})` : ''}
              </option>
            ))}
          </select>
          {instructorsError && <p className="admin-course-error" role="alert">{instructorsError}</p>}
          {!instructorsLoading && instructors.length === 0 && !instructorsError && (
            <p className="admin-course-empty-state">No instructor accounts are available. Create or approve an instructor account before assigning this course.</p>
          )}
        </div>
        <label>Price in INR<input inputMode="decimal" value={form.priceInRupees} onChange={(event) => update('priceInRupees', event.target.value)} placeholder="Leave empty when enrollment is closed" /></label>
        <label className="admin-check"><input type="checkbox" checked={form.enrollmentOpen} onChange={(event) => update('enrollmentOpen', event.target.checked)} /> Enrollment Open</label>
        <div className="admin-form-actions"><Link className="button button-outline" to="/admin/courses">Cancel</Link><button className="button button-primary" disabled={saving} type="submit"><Save size={17} /> {saving ? 'Saving...' : 'Save Course'}</button></div>
      </form>
    </main>
  )
}

export default AdminCourseForm
