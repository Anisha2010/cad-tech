import { BookOpen, CheckCircle2, PlayCircle, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import StudentPortalLayout from '../../../components/student/StudentPortalLayout.jsx'
import { getStudentLearning, updateStudentLessonPosition, updateStudentLessonProgress } from '../../../services/studentLearningService.js'
import { resolveVideoResource } from './videoResource.js'
import './LearningPlayer.css'

function LearningPlayer() {
  const { courseSlug } = useParams()
  const [learning, setLearning] = useState(null)
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  const loadLearning = useCallback(() => {
    setLoading(true)
    setError('')
    getStudentLearning(courseSlug)
      .then((result) => {
        setLearning(result)
        const firstLesson = result?.curriculum?.sections?.flatMap((section) => section.lessons)?.[0]
        setSelectedLessonId(firstLesson?.id || '')
      })
      .catch(() => setError('Unable to load this course lesson content right now.'))
      .finally(() => setLoading(false))
  }, [courseSlug])

  useEffect(() => {
    if (courseSlug) loadLearning()
  }, [courseSlug, loadLearning])

  const allLessons = useMemo(() => learning?.curriculum?.sections?.flatMap((section) => section.lessons) ?? [], [learning])
  const currentLesson = allLessons.find((lesson) => lesson.id === selectedLessonId) || allLessons[0] || null

  useEffect(() => {
    if (currentLesson && (!selectedLessonId || selectedLessonId !== currentLesson.id)) {
      setSelectedLessonId(currentLesson.id)
    }
  }, [currentLesson, selectedLessonId])

  const handleLessonSelect = (lesson) => {
    setSelectedLessonId(lesson.id)
    if (lesson.progress?.lastPositionSeconds) {
      updateStudentLessonPosition(courseSlug, lesson.id, { positionSeconds: lesson.progress.lastPositionSeconds })
    }
  }

  const handleLessonProgress = async (status) => {
    if (!courseSlug || !currentLesson) return

    setUpdating(true)
    try {
      await updateStudentLessonProgress(courseSlug, currentLesson.id, {
        status,
        completed: status === 'completed',
        lastPositionSeconds: currentLesson.progress?.lastPositionSeconds || 0,
        title: currentLesson.title
      })
      await loadLearning()
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <StudentPortalLayout><main className="student-content-area"><div className="dashboard-skeleton" role="status" aria-live="polite">Loading lesson player...</div></main></StudentPortalLayout>
  }

  if (error) {
    return <StudentPortalLayout><main className="student-content-area"><div className="dashboard-error" role="alert"><div><strong>{error}</strong><p>Please try again in a moment.</p></div><button className="button button-outline" type="button" onClick={loadLearning}><RefreshCw size={16} /> Try again</button></div></main></StudentPortalLayout>
  }

  if (!learning?.course || !learning.curriculum) {
    return <StudentPortalLayout><main className="student-content-area"><div className="empty-state"><BookOpen size={26} /><h3>No learning content available</h3><p>This course does not have any published lessons yet.</p><Link className="button button-primary" to="/student/my-courses">Return to my courses</Link></div></main></StudentPortalLayout>
  }

  return (
    <StudentPortalLayout>
      <main className="student-content-area student-learning-layout">
        <aside className="student-panel student-learning-curriculum">
          <div className="panel-header">
            <h3>{learning.course.title}</h3>
          </div>
          <p style={{ marginBottom: '1rem' }}>{learning.curriculum.progressPercentage}% complete</p>
          {learning.curriculum.sections.map((section) => (
            <div key={section.id} style={{ marginBottom: '1rem' }}>
              <h4>{section.title}</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {section.lessons.map((lesson) => (
                  <li key={lesson.id} style={{ marginBottom: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleLessonSelect(lesson)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: selectedLessonId === lesson.id ? '1px solid #2563eb' : '1px solid transparent',
                        borderRadius: '0.75rem',
                        background: selectedLessonId === lesson.id ? '#e0ecff' : '#f3f4f6',
                        padding: '0.75rem 0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      <strong>{lesson.title}</strong>
                      <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                        {lesson.lessonType} · {lesson.progress?.status === 'completed' ? 'Completed' : lesson.progress?.status === 'in_progress' ? 'In progress' : 'Not started'}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <section className="student-panel student-learning-lesson">
          {currentLesson ? (
            <>
              <div className="panel-header">
                <h3>{currentLesson.title}</h3>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '1rem', padding: '1.25rem', minHeight: '200px', marginBottom: '1rem' }}>
                {currentLesson.lessonType === 'video' && (
                  <div>
                    <PlayCircle size={36} />
                    <p>Video lesson ready to play.</p>
                    {(() => {
                      const video = resolveVideoResource(currentLesson.resourceUrl)
                      if (!video) return currentLesson.resourceUrl
                        ? <a href={currentLesson.resourceUrl} target="_blank" rel="noreferrer">Open resource</a>
                        : <p>No video URL has been published for this lesson yet.</p>
                      if (video.type === 'file') return <video className="student-learning-video" controls playsInline preload="metadata"><source src={video.src} /></video>
                      return <iframe className="student-learning-video-embed" src={video.src} title={`${currentLesson.title} video`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                    })()}
                  </div>
                )}
                {currentLesson.lessonType === 'article' && (
                  <div>
                    <BookOpen size={36} />
                    <p>{currentLesson.content || 'Lesson notes are available in this course curriculum once published.'}</p>
                  </div>
                )}
                {currentLesson.lessonType === 'pdf' && (
                  <div>
                    <BookOpen size={36} />
                    <p>Reference PDF</p>
                    {currentLesson.resourceUrl ? <a href={currentLesson.resourceUrl} target="_blank" rel="noreferrer">Download PDF</a> : <p>No PDF file has been published yet.</p>}
                  </div>
                )}
                {currentLesson.lessonType === 'quiz' && (
                  <div>
                    <CheckCircle2 size={36} />
                    {currentLesson.quiz?.id ? (
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {(() => {
                          const quiz = currentLesson.quiz
                          const latestAttempt = quiz.latestAttempt
                          const hasAttemptsRemaining = quiz.remainingAttempts > 0
                          const hasOpenAttempt = Boolean(quiz.inProgressAttemptId)
                          const label = hasOpenAttempt
                            ? 'Resume Quiz'
                            : latestAttempt?.passed === true
                              ? 'View Result'
                              : latestAttempt?.passed === false && hasAttemptsRemaining
                                ? 'Retry Quiz'
                                : latestAttempt
                                  ? 'No Attempts Remaining'
                                  : hasAttemptsRemaining
                                    ? 'Start Quiz'
                                    : 'No Attempts Remaining'
                          const target = hasOpenAttempt
                            ? `/student/learn/${courseSlug}/quiz/${quiz.id}`
                            : latestAttempt?.passed === true
                              ? `/student/quizzes/${quiz.id}/results/${latestAttempt.id}`
                              : hasAttemptsRemaining
                                ? `/student/learn/${courseSlug}/quiz/${quiz.id}`
                                : '#'

                          return (
                            <Link
                              className="button button-primary"
                              to={target}
                              onClick={(event) => { if (target === '#') event.preventDefault() }}
                              aria-disabled={target === '#'}
                              style={{ pointerEvents: target === '#' ? 'none' : 'auto', opacity: target === '#' ? 0.6 : 1 }}
                            >
                              {label}
                            </Link>
                          )
                        })()}
                      </div>
                    ) : (
                      <p>No approved and published quiz is currently available for this lesson.</p>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="button button-primary" type="button" onClick={() => handleLessonProgress('in_progress')} disabled={updating}>
                  Save progress
                </button>
                <button className="button button-outline" type="button" onClick={() => handleLessonProgress('completed')} disabled={updating}>
                  Mark as complete
                </button>
              </div>
              {currentLesson.description && <p style={{ marginTop: '1rem' }}>{currentLesson.description}</p>}
            </>
          ) : (
            <p>No lesson selected.</p>
          )}
        </section>
      </main>
    </StudentPortalLayout>
  )
}

export default LearningPlayer
