import { ArrowLeft, BookOpenText, CheckCircle2, FileText, Plus, Save, Trash2, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { uploadAdminCourseMedia } from '../../services/mediaUploadService.js'
import {
  archiveCurriculumLesson,
  archiveCurriculumSection,
  createCurriculumLesson,
  createCurriculumSection,
  fetchAdminCurriculum,
  publishCurriculum,
  updateCurriculumLesson,
  updateCurriculumSection
} from '../../services/adminCurriculumService.js'
import './AdminCurriculumBuilder.css'

const emptySectionForm = { title: '', description: '' }
const emptyLessonForm = { title: '', description: '', type: 'video', videoUrl: '', articleContent: '', pdfUrl: '', resources: [], durationSeconds: '' }

function AdminCurriculumBuilder() {
  const { courseId } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [course, setCourse] = useState(null)
  const [curriculum, setCurriculum] = useState({ sections: [] })
  const [sectionForm, setSectionForm] = useState(emptySectionForm)
  const [lessonForms, setLessonForms] = useState({})
  const [editingSectionId, setEditingSectionId] = useState(null)
  const [editingLessonId, setEditingLessonId] = useState(null)
  const [uploadingMedia, setUploadingMedia] = useState('')

  const loadCurriculum = async () => {
    if (!courseId) return
    setLoading(true)
    try {
      const result = await fetchAdminCurriculum(courseId)
      setCourse(result.course)
      setCurriculum(result.curriculum || { sections: [] })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load curriculum.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCurriculum()
  }, [courseId])

  const setFormValue = (key, value) => setSectionForm((current) => ({ ...current, [key]: value }))

  const setLessonFormValue = (sectionId, key, value) => {
    setLessonForms((current) => ({
      ...current,
      [sectionId]: {
        ...(current[sectionId] || emptyLessonForm),
        [key]: value
      }
    }))
  }

  const handleLessonFileUpload = async (sectionId, kind, event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const uploadKey = `${sectionId}:${kind}`
    setUploadingMedia(uploadKey)
    setError('')
    try {
      const result = await uploadAdminCourseMedia(kind, file)
      const url = result?.media?.url
      if (!url) throw new Error('The upload did not return a media URL.')
      if (kind === 'video') setLessonFormValue(sectionId, 'videoUrl', url)
      else if (kind === 'pdf') setLessonFormValue(sectionId, 'pdfUrl', url)
      else setLessonFormValue(sectionId, 'resources', [...(lessonForms[sectionId]?.resources || []), { title: file.name, url }])
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || `Unable to upload ${kind} file.`)
    } finally {
      setUploadingMedia('')
      event.target.value = ''
    }
  }

  const refreshCurriculum = async () => {
    if (!courseId) return
    const result = await fetchAdminCurriculum(courseId)
    setCourse(result.course)
    setCurriculum(result.curriculum || { sections: [] })
  }

  const handleCreateSection = async (event) => {
    event.preventDefault()
    setError('')
    if (!sectionForm.title.trim()) return setError('Section title is required.')

    setSaving(true)
    try {
      await createCurriculumSection(courseId, sectionForm)
      setSectionForm(emptySectionForm)
      await refreshCurriculum()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create section.')
    } finally {
      setSaving(false)
    }
  }

  const handleSectionUpdate = async (sectionId) => {
    const field = document.getElementById(`section-title-${sectionId}`)
    const descriptionField = document.getElementById(`section-description-${sectionId}`)
    const nextTitle = (field?.value || '').trim()
    const nextDescription = descriptionField?.value || ''

    if (!nextTitle) {
      setError('Section title is required.')
      return
    }

    setSaving(true)
    try {
      await updateCurriculumSection(courseId, sectionId, { title: nextTitle, description: nextDescription })
      setEditingSectionId(null)
      await refreshCurriculum()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update section.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('Archive this section and hide it from students?')) return
    setSaving(true)
    try {
      await archiveCurriculumSection(courseId, sectionId)
      await refreshCurriculum()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to archive section.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateLesson = async (sectionId) => {
    const form = lessonForms[sectionId] || emptyLessonForm
    if (!form.title?.trim()) {
      setError('Lesson title is required.')
      return
    }

    setSaving(true)
    try {
      await createCurriculumLesson(courseId, sectionId, {
        title: form.title,
        description: form.description || '',
        type: form.type || 'video',
        videoUrl: form.videoUrl || '',
        articleContent: form.articleContent || '',
        pdfUrl: form.pdfUrl || '',
        resources: form.resources || [],
        durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : null
      })
      setLessonForms((current) => ({ ...current, [sectionId]: emptyLessonForm }))
      await refreshCurriculum()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create lesson.')
    } finally {
      setSaving(false)
    }
  }

  const handleLessonUpdate = async (sectionId, lessonId) => {
    const field = document.getElementById(`lesson-title-${lessonId}`)
    const descriptionField = document.getElementById(`lesson-description-${lessonId}`)
    const typeField = document.getElementById(`lesson-type-${lessonId}`)
    const nextTitle = (field?.value || '').trim()
    const nextDescription = descriptionField?.value || ''

    if (!nextTitle) {
      setError('Lesson title is required.')
      return
    }

    setSaving(true)
    try {
      await updateCurriculumLesson(courseId, sectionId, lessonId, {
        title: nextTitle,
        description: nextDescription,
        type: typeField?.value || 'video'
      })
      setEditingLessonId(null)
      await refreshCurriculum()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update lesson.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLesson = async (sectionId, lessonId) => {
    if (!window.confirm('Archive this lesson and hide it from students?')) return
    setSaving(true)
    try {
      await archiveCurriculumLesson(courseId, sectionId, lessonId)
      await refreshCurriculum()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to archive lesson.')
    } finally {
      setSaving(false)
    }
  }

  const handlePublishToggle = async () => {
    const nextPublished = !(curriculum?.isPublished)
    setSaving(true)
    try {
      const result = await publishCurriculum(courseId, nextPublished)
      setCurriculum(result.curriculum || { ...curriculum, isPublished: nextPublished })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to publish curriculum.')
    } finally {
      setSaving(false)
    }
  }

  const sections = Array.isArray(curriculum?.sections) ? curriculum.sections.filter((section) => !section.archivedAt) : []

  if (loading) return <main className="admin-page"><p className="admin-state">Loading curriculum...</p></main>

  return (
    <main className="admin-page curriculum-page">
      <div className="curriculum-header-strip">
        <Link className="admin-back-link" to="/admin/courses"><ArrowLeft size={16} /> Back to courses</Link>
        <button type="button" className="button button-primary" disabled={saving} onClick={handlePublishToggle}>
          <CheckCircle2 size={16} /> {curriculum?.isPublished ? 'Unpublish' : 'Publish'}
        </button>
      </div>

      <header className="admin-page-header"><div><p className="admin-kicker">COURSE CURRICULUM</p><h1>{course?.title || 'Curriculum Builder'}</h1><p>{course?.slug || 'Build the learning path for this course.'}</p></div></header>
      {error && <p className="admin-error" role="alert">{error}</p>}

      <form className="admin-curriculum-card" onSubmit={handleCreateSection}>
        <h2>Add section</h2>
        <div className="curriculum-form-grid">
          <label>Section title<input value={sectionForm.title} onChange={(event) => setFormValue('title', event.target.value)} placeholder="Foundation concepts" /></label>
          <label>Description<textarea rows="3" value={sectionForm.description} onChange={(event) => setFormValue('description', event.target.value)} placeholder="What students will cover in this module" /></label>
        </div>
        <button className="button button-primary" type="submit" disabled={saving}><Plus size={16} /> {saving ? 'Saving...' : 'Create section'}</button>
      </form>

      <div className="curriculum-list">
        {sections.length === 0 ? <p className="admin-state">No active sections yet. Add a section to get started.</p> : sections.map((section) => (
          <section key={section.id} className="admin-curriculum-card">
            <div className="section-header">
              <div>
                {editingSectionId === section.id ? (
                  <div className="curriculum-inline-edit">
                    <input id={`section-title-${section.id}`} defaultValue={section.title} />
                    <textarea id={`section-description-${section.id}`} rows="3" defaultValue={section.description} />
                  </div>
                ) : (
                  <>
                    <h3>{section.title}</h3>
                    {section.description && <p>{section.description}</p>}
                  </>
                )}
              </div>
              <div className="section-actions">
                {editingSectionId === section.id ? (
                  <button type="button" className="button button-primary" onClick={() => handleSectionUpdate(section.id)}><Save size={15} /> Save</button>
                ) : (
                  <button type="button" className="button button-outline" onClick={() => setEditingSectionId(section.id)}><BookOpenText size={15} /> Edit</button>
                )}
                <button type="button" className="button button-danger" onClick={() => handleDeleteSection(section.id)}><Trash2 size={15} /> Archive</button>
              </div>
            </div>

            <div className="lesson-form">
              <h4>Add lesson</h4>
              <div className="curriculum-form-grid compact">
                <label>Title<input value={lessonForms[section.id]?.title ?? ''} onChange={(event) => setLessonFormValue(section.id, 'title', event.target.value)} placeholder="Lesson title" /></label>
                <label>Type<select value={lessonForms[section.id]?.type ?? 'video'} onChange={(event) => setLessonFormValue(section.id, 'type', event.target.value)}><option value="video">Video</option><option value="article">Article</option><option value="pdf">PDF</option></select></label>
                <label>Duration (sec)<input type="number" min="0" value={lessonForms[section.id]?.durationSeconds ?? ''} onChange={(event) => setLessonFormValue(section.id, 'durationSeconds', event.target.value)} /></label>
              </div>
              <label>Description<textarea rows="2" value={lessonForms[section.id]?.description ?? ''} onChange={(event) => setLessonFormValue(section.id, 'description', event.target.value)} placeholder="Short summary" /></label>
              {((lessonForms[section.id]?.type ?? 'video') === 'video') && (
                <><label>Video URL<input type="url" value={lessonForms[section.id]?.videoUrl ?? ''} onChange={(event) => setLessonFormValue(section.id, 'videoUrl', event.target.value)} placeholder="https://..." /></label><label>Upload video<input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" onChange={(event) => handleLessonFileUpload(section.id, 'video', event)} disabled={uploadingMedia === `${section.id}:video`} />{uploadingMedia === `${section.id}:video` && <span role="status">Uploading video...</span>}</label></>
              )}
              {((lessonForms[section.id]?.type ?? 'video') === 'article') && (
                <label>Article content<textarea rows="4" value={lessonForms[section.id]?.articleContent ?? ''} onChange={(event) => setLessonFormValue(section.id, 'articleContent', event.target.value)} placeholder="Long-form lesson content" /></label>
              )}
              {((lessonForms[section.id]?.type ?? 'video') === 'pdf') && (
                <><label>PDF URL<input type="url" value={lessonForms[section.id]?.pdfUrl ?? ''} onChange={(event) => setLessonFormValue(section.id, 'pdfUrl', event.target.value)} placeholder="https://..." /></label><label>Upload PDF<input type="file" accept="application/pdf" onChange={(event) => handleLessonFileUpload(section.id, 'pdf', event)} disabled={uploadingMedia === `${section.id}:pdf`} />{uploadingMedia === `${section.id}:pdf` && <span role="status">Uploading PDF...</span>}</label></>
              )}
              <label>Upload resource file<input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.csv,.jpg,.jpeg,.png,.webp" onChange={(event) => handleLessonFileUpload(section.id, 'resource', event)} disabled={uploadingMedia === `${section.id}:resource`} />{uploadingMedia === `${section.id}:resource` && <span role="status">Uploading resource...</span>}</label>
              {(lessonForms[section.id]?.resources || []).map((resource) => <p key={resource.url}>{resource.title} uploaded</p>)}
              <button type="button" className="button button-primary" onClick={() => handleCreateLesson(section.id)}><Plus size={15} /> Add lesson</button>
            </div>

            <div className="lesson-list">
              {(!section.lessons || section.lessons.length === 0) ? <p className="admin-state small">No lessons added yet.</p> : section.lessons.filter((lesson) => !lesson.archivedAt).map((lesson) => (
                <div key={lesson.id} className="lesson-item">
                  <div className="lesson-meta">
                    <span className="lesson-type-badge"><FileText size={12} /> {lesson.type || 'video'}</span>
                    <strong>{lesson.title}</strong>
                    {lesson.description && <p>{lesson.description}</p>}
                  </div>
                  <div className="lesson-actions">
                    {editingLessonId === lesson.id ? (
                      <div className="lesson-edit-panel">
                        <input id={`lesson-title-${lesson.id}`} defaultValue={lesson.title} />
                        <textarea id={`lesson-description-${lesson.id}`} rows="3" defaultValue={lesson.description || ''} />
                        <select id={`lesson-type-${lesson.id}`} defaultValue={lesson.type || 'video'}>
                          <option value="video">Video</option>
                          <option value="article">Article</option>
                          <option value="pdf">PDF</option>
                        </select>
                        <button type="button" className="button button-primary" onClick={() => handleLessonUpdate(section.id, lesson.id)}><Save size={15} /> Save</button>
                      </div>
                    ) : (
                      <button type="button" className="button button-outline" onClick={() => setEditingLessonId(lesson.id)}><Video size={15} /> Edit</button>
                    )}
                    <button type="button" className="button button-danger" onClick={() => handleDeleteLesson(section.id, lesson.id)}><Trash2 size={15} /> Archive</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

export default AdminCurriculumBuilder
