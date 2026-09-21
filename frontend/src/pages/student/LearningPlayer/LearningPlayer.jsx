import { BookOpen, CheckCircle2, PlayCircle, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getStudentLearning, updateStudentLessonPosition, updateStudentLessonProgress } from '../../../services/studentLearningService.js'
import { getQuizHistory } from '../../../services/studentQuizService.js'

function LearningPlayer() {
  const { courseSlug } = useParams()
  const [learning, setLearning] = useState(null)
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [quizHistory, setQuizHistory] = useState([])

  const loadLearning = () => {
    setLoading(true)
    setError('')
    Promise.all([
      getStudentLearning(courseSlug),
      getQuizHistory()
    ])
      .then(([result, history]) => {
        setLearning(result)
        setQuizHistory(Array.isArray(history) ? history : [])
        const firstLesson = result?.curriculum?.sections?.flatMap((section) => section.lessons)?.[0]
        setSelectedLessonId(firstLesson?.id || '')
      })
      .catch(() => setError('Unable to load this course lesson content right now.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (courseSlug) loadLearning()
  }, [courseSlug])

  const allLessons = useMemo(() => learning?.curriculum?.sections?.flatMap((section) => section.lessons) ?? [], [learning])
  const currentLesson = allLessons.find((lesson) => lesson.id === selectedLessonId) || allLessons[0] || null

  const quizStatusMap = useMemo(() => {
    const map = new Map()
    for (const item of quizHistory) {
      if (!item?.quizId) continue
      map.set(item.quizId, item)
    }
    return map
  }, [quizHistory])

  useEffect(() => {
    if (currentLesson && selectedLessonId && !selectedLessonId) {
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
    return <main className="student-content-area"><div className="dashboard-skeleton" role="status" aria-live="polite">Loading lesson player...</div></main>
  }

  if (error) {
    return <main className="student-content-area"><div className="dashboard-error" role="alert"><div><strong>{error}</strong><p>Please try again in a moment.</p></div><button className="button button-outline" type="button" onClick={loadLearning}><RefreshCw size={16} /> Try again</button></div></main>
  }

  if (!learning?.course || !learning.curriculum) {
    return <main className="student-content-area"><div className="empty-state"><BookOpen size={26} /><h3>No learning content available</h3><p>This course does not have any published lessons yet.</p><Link className="button button-primary" to="/student/my-courses">Return to my courses</Link></div></main>
  }

  return (
    <main className="student-content-area" style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: '1.5rem', padding: '2rem' }}>
      <aside className="student-panel" style={{ padding: '1rem' }}>
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

      <section className="student-panel" style={{ padding: '1.5rem' }}>
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
                  {currentLesson.resourceUrl ? <a href={currentLesson.resourceUrl} target="_blank" rel="noreferrer">Open resource</a> : <p>No video URL has been published for this lesson yet.</p>}
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
                  <p>Published quiz available for this lesson.</p>
                  {currentLesson.quizId ? (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {(() => {
                        const currentAttempt = quizStatusMap.get(currentLesson.quizId)
                        const hasResult = Boolean(currentAttempt && currentAttempt.passed !== null)
                        const canRetry = currentAttempt?.remainingAttempts > 0 || (!currentAttempt && currentLesson.maximumAttempts > 0)
                        const buttonLabel = currentAttempt ? (hasResult ? 'View Result' : 'Resume Quiz') : 'Start Quiz'
                        const target = currentAttempt ? `/student/quizzes/${currentLesson.quizId}/results/${currentAttempt.id}` : `/student/quizzes/${currentLesson.quizId}/attempt/new`
                        return (
                          <Link className="button button-primary" to={target}>
                            {buttonLabel}
                          </Link>
                        )
                      })()}
                    </div>
                  ) : (
                    <p>No quiz is attached to this lesson yet.</p>
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
  )
}

export default LearningPlayer
