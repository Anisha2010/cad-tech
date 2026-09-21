import { ArrowLeft, BookOpenText, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createInstructorCurriculumLesson,
  createInstructorCurriculumSection,
  deleteInstructorCurriculumLesson,
  deleteInstructorCurriculumSection,
  fetchInstructorCurriculum,
  updateInstructorCurriculumLesson,
  updateInstructorCurriculumSection
} from '../../services/instructorService.js'

const emptySection = { title: '', description: '' }
const emptyLesson = { title: '', description: '', type: 'video', videoUrl: '', articleContent: '', pdfUrl: '', durationSeconds: '' }

function InstructorCurriculumBuilder() {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [curriculum, setCurriculum] = useState({ sections: [] })
  const [sectionForm, setSectionForm] = useState(emptySection)
  const [lessonForms, setLessonForms] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadCurriculum = async () => {
    if (!courseId) return
    setLoading(true)
    try {
      const result = await fetchInstructorCurriculum(courseId)
      setCourse(result.course)
      setCurriculum(result.curriculum || { sections: [] })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load curriculum.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCurriculum() }, [courseId])

  const updateSectionForm = (field, value) => setSectionForm((current) => ({ ...current, [field]: value }))
  const updateLessonForm = (sectionId, field, value) => {
    setLessonForms((current) => ({
      ...current,
      [sectionId]: {
        ...(current[sectionId] || emptyLesson),
        [field]: value
      }
    }))
  }

  const handleCreateSection = async (event) => {
    event.preventDefault()
    if (!sectionForm.title.trim()) {
      setError('Section title is required.')
      return
    }

    setSaving(true)
    try {
      await createInstructorCurriculumSection(courseId, sectionForm)
      setSectionForm(emptySection)
      await loadCurriculum()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create section.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateLesson = async (sectionId) => {
    const form = lessonForms[sectionId] || emptyLesson
    if (!form.title?.trim()) {
      setError('Lesson title is required.')
      return
    }

    setSaving(true)
    try {
      await createInstructorCurriculumLesson(courseId, sectionId, {
        title: form.title,
        description: form.description || '',
        type: form.type || 'video',
        videoUrl: form.videoUrl || '',
        articleContent: form.articleContent || '',
        pdfUrl: form.pdfUrl || '',
        durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : null
      })
      setLessonForms((current) => ({ ...current, [sectionId]: emptyLesson }))
      await loadCurriculum()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create lesson.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSection = async (sectionId) => {
    const title = document.getElementById(`instructor-section-title-${sectionId}`)?.value || ''
    const description = document.getElementById(`instructor-section-description-${sectionId}`)?.value || ''
    setSaving(true)
    try {
      await updateInstructorCurriculumSection(courseId, sectionId, { title, description })
      await loadCurriculum()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update section.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateLesson = async (sectionId, lessonId) => {
    const title = document.getElementById(`instructor-lesson-title-${lessonId}`)?.value || ''
    const description = document.getElementById(`instructor-lesson-description-${lessonId}`)?.value || ''
    const type = document.getElementById(`instructor-lesson-type-${lessonId}`)?.value || 'video'

    setSaving(true)
    try {
      await updateInstructorCurriculumLesson(courseId, sectionId, lessonId, { title, description, type })
      await loadCurriculum()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update lesson.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('Archive this section?')) return
    setSaving(true)
    try {
      await deleteInstructorCurriculumSection(courseId, sectionId)
      await loadCurriculum()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to archive section.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLesson = async (sectionId, lessonId) => {
    if (!window.confirm('Archive this lesson?')) return
    setSaving(true)
    try {
      await deleteInstructorCurriculumLesson(courseId, sectionId, lessonId)
      await loadCurriculum()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to archive lesson.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <main className="admin-page"><p className="admin-state">Loading curriculum...</p></main>
  }

  const sections = Array.isArray(curriculum.sections) ? curriculum.sections.filter((section) => !section.archivedAt) : []

  return (
    <main className="admin-page curriculum-page">
      <div className="curriculum-header-strip">
        <Link className="admin-back-link" to="/instructor/courses"><ArrowLeft size={16} /> Back to courses</Link>
      </div>

      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">COURSE CURRICULUM</p>
          <h1>{course?.title || 'Curriculum Builder'}</h1>
          <p>{course?.slug || 'Build and refine your learning path.'}</p>
        </div>
      </header>

      {error && <p className="admin-error" role="alert">{error}</p>}

      <form className="admin-curriculum-card" onSubmit={handleCreateSection}>
        <h2>Add section</h2>
        <div className="curriculum-form-grid">
          <label>Section title<input value={sectionForm.title} onChange={(event) => updateSectionForm('title', event.target.value)} placeholder="Foundation concepts" /></label>
          <label>
            Description
            <textarea rows="3" value={sectionForm.description} onChange={(event) => updateSectionForm('description', event.target.value)} placeholder="What students will cover in this module" />
          </label>
        </div>
        <button className="button button-primary" type="submit" disabled={saving}><Plus size={16} /> {saving ? 'Saving...' : 'Create section'}</button>
      </form>

      <div className="curriculum-list">
        {sections.length === 0 ? (
          <p className="admin-state">No sections created yet.</p>
        ) : sections.map((section) => (
          <section key={section.id} className="admin-curriculum-card">
            <div className="section-header">
              <div>
                <input id={`instructor-section-title-${section.id}`} defaultValue={section.title} />
                <textarea id={`instructor-section-description-${section.id}`} rows="3" defaultValue={section.description || ''} />
              </div>
              <div className="section-actions">
                <button type="button" className="button button-primary" onClick={() => handleUpdateSection(section.id)}><Save size={15} /> Save</button>
                <button type="button" className="button button-danger" onClick={() => handleDeleteSection(section.id)}><Trash2 size={15} /> Archive</button>
              </div>
            </div>

            <div className="lesson-form">
              <h4>Add lesson</h4>
              <div className="curriculum-form-grid compact">
                <label>Title<input value={lessonForms[section.id]?.title ?? ''} onChange={(event) => updateLessonForm(section.id, 'title', event.target.value)} /></label>
                <label>Type<select value={lessonForms[section.id]?.type ?? 'video'} onChange={(event) => updateLessonForm(section.id, 'type', event.target.value)}><option value="video">Video</option><option value="article">Article</option><option value="pdf">PDF</option></select></label>
                <label>Duration (sec)<input type="number" min="0" value={lessonForms[section.id]?.durationSeconds ?? ''} onChange={(event) => updateLessonForm(section.id, 'durationSeconds', event.target.value)} /></label>
              </div>
              <div className="curriculum-form-grid compact">
                <label>Video URL<input value={lessonForms[section.id]?.videoUrl ?? ''} onChange={(event) => updateLessonForm(section.id, 'videoUrl', event.target.value)} /></label>
                <label>PDF URL<input value={lessonForms[section.id]?.pdfUrl ?? ''} onChange={(event) => updateLessonForm(section.id, 'pdfUrl', event.target.value)} /></label>
              </div>
              <label className="full-width">Lesson description<textarea rows="3" value={lessonForms[section.id]?.description ?? ''} onChange={(event) => updateLessonForm(section.id, 'description', event.target.value)} /></label>
              <label className="full-width">Article content<textarea rows="3" value={lessonForms[section.id]?.articleContent ?? ''} onChange={(event) => updateLessonForm(section.id, 'articleContent', event.target.value)} /></label>
              <button type="button" className="button button-primary" onClick={() => handleCreateLesson(section.id)}><Plus size={15} /> Add lesson</button>
            </div>

            {Array.isArray(section.lessons) && section.lessons.filter((lesson) => !lesson.archivedAt).length > 0 && (
              <div className="curriculum-lesson-list">
                {section.lessons.filter((lesson) => !lesson.archivedAt).map((lesson) => (
                  <div key={lesson.id} className="curriculum-lesson-item">
                    <div className="lesson-meta-row">
                      <BookOpenText size={16} />
                      <div>
                        <strong>{lesson.title}</strong>
                        <small>{lesson.type}</small>
                      </div>
                    </div>
                    <div className="curriculum-inline-edit">
                      <input id={`instructor-lesson-title-${lesson.id}`} defaultValue={lesson.title} />
                      <textarea id={`instructor-lesson-description-${lesson.id}`} rows="2" defaultValue={lesson.description || ''} />
                      <select id={`instructor-lesson-type-${lesson.id}`} defaultValue={lesson.type || 'video'}>
                        <option value="video">Video</option>
                        <option value="article">Article</option>
                        <option value="pdf">PDF</option>
                      </select>
                    </div>
                    <div className="section-actions">
                      <button type="button" className="button button-primary" onClick={() => handleUpdateLesson(section.id, lesson.id)}><Save size={15} /> Save</button>
                      <button type="button" className="button button-danger" onClick={() => handleDeleteLesson(section.id, lesson.id)}><Trash2 size={15} /> Archive</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}

export default InstructorCurriculumBuilder
