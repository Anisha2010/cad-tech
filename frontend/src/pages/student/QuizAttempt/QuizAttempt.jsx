import { AlertTriangle, Clock3, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import StudentPortalLayout from '../../../components/student/StudentPortalLayout.jsx'
import { getQuizAttempt, saveQuizAnswer, startQuizAttempt, submitQuizAttempt } from '../../../services/studentQuizService.js'
import './QuizAttempt.css'

function QuizAttempt() {
  const { courseSlug, quizId, attemptId } = useParams()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [selectionOverrides, setSelectionOverrides] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [autoSubmitFailed, setAutoSubmitFailed] = useState(false)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null)
  const autoSubmitStarted = useRef(false)
  const questions = attempt?.questions ?? []
  const currentQuestion = questions[currentIndex] ?? null

  const loadAttempt = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const nextAttempt = attemptId ? await getQuizAttempt(attemptId) : await startQuizAttempt(quizId)
      setAttempt(nextAttempt)
      setCurrentIndex(0)
      setSelectionOverrides({})
      autoSubmitStarted.current = false
      if (nextAttempt?.status && nextAttempt.status !== 'in_progress') {
        navigate(`/student/quizzes/${quizId}/results/${nextAttempt.id}`, { replace: true })
        return
      }
      if (nextAttempt?.id && !attemptId) {
        navigate(`/student/quizzes/${quizId}/attempt/${nextAttempt.id}`, { replace: true })
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load this quiz attempt.')
    } finally {
      setLoading(false)
    }
  }, [attemptId, navigate, quizId])

  const handleSubmit = useCallback(async ({ automatic = false } = {}) => {
    if (!attempt?.id || submitting) return
    const unanswered = (attempt.questions || []).filter((question) => !selectionOverrides[question.id] && !question.selectedOptionId && !question.textAnswer && !question.answered).length

    if (!automatic) {
      const message = unanswered > 0
        ? `Submit quiz?\nYou still have ${unanswered} unanswered questions. Answers cannot be changed after submission.`
        : 'Submit quiz?\nAnswers cannot be changed after submission.'
      const confirmed = window.confirm(message)
      if (!confirmed) return
    }

    if (automatic && autoSubmitStarted.current) return
    if (automatic) autoSubmitStarted.current = true
    setSubmitting(true)
    setAutoSubmitFailed(false)
    try {
      const result = await submitQuizAttempt(attempt.id)
      navigate(`/student/quizzes/${quizId}/results/${result.id || attempt.id}`)
    } catch (requestError) {
      if (automatic) {
        autoSubmitStarted.current = false
        setAutoSubmitFailed(true)
      } else {
        setError(requestError?.response?.data?.message || 'Unable to submit this quiz right now.')
      }
    } finally {
      setSubmitting(false)
    }
  }, [attempt, navigate, quizId, selectionOverrides, submitting])

  useEffect(() => {
    if (!quizId) return
    loadAttempt()
  }, [loadAttempt, quizId])

  useEffect(() => {
    if (!attempt?.expiresAt) {
      setTimeLeftSeconds(null)
      return undefined
    }

    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000))
      setTimeLeftSeconds(remainingSeconds)
    }

    updateCountdown()
    const timerId = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(timerId)
  }, [attempt?.expiresAt])

  useEffect(() => {
    if (timeLeftSeconds === 0 && attempt?.id && !submitting && !autoSubmitStarted.current) {
      handleSubmit({ automatic: true })
    }
  }, [timeLeftSeconds, attempt?.id, submitting, handleSubmit])

  const updateAnswer = useCallback(async (answerValue) => {
    if (!attempt?.id || !currentQuestion) return

    setSelectionOverrides((current) => ({ ...current, [currentQuestion.id]: answerValue }))
    setSaveError('')
    setSaving(true)
    try {
      const answerPayload = currentQuestion.type === 'short_answer'
        ? { questionId: currentQuestion.id, selectedOptionId: null, textAnswer: answerValue }
        : { questionId: currentQuestion.id, selectedOptionId: answerValue }
      const saved = await saveQuizAnswer(attempt.id, {
        ...answerPayload
      })
      setAttempt((previous) => {
        if (!previous) return previous
        return {
          ...previous,
          questions: previous.questions.map((question) => question.id === currentQuestion.id ? {
            ...question,
            selectedOptionId: saved?.selectedOptionId ?? null,
            textAnswer: saved?.textAnswer ?? question.textAnswer
          } : question)
        }
      })
      setSelectionOverrides((current) => {
        const next = { ...current }
        delete next[currentQuestion.id]
        return next
      })
    } catch (requestError) {
      setSaveError(requestError?.response?.data?.message || 'Unable to save this answer.')
    } finally {
      setSaving(false)
    }
  }, [attempt, currentQuestion])

  if (loading) {
    return <StudentPortalLayout><main className="student-quiz-page"><div className="student-page-loading">Loading quiz…</div></main></StudentPortalLayout>
  }

  if (error) {
    return <StudentPortalLayout><main className="student-quiz-page"><div className="student-page-error"><strong>{error}</strong><button type="button" className="button button-primary" onClick={loadAttempt}>Try again</button></div></main></StudentPortalLayout>
  }

  if (!attempt || !questions.length) {
    return <StudentPortalLayout><main className="student-quiz-page"><div className="student-page-empty"><h2>No quiz questions available</h2><Link className="button button-primary" to={courseSlug ? `/student/learn/${courseSlug}` : '/student/my-courses'}>Back to course</Link></div></main></StudentPortalLayout>
  }

  const timeLabel = timeLeftSeconds === null ? 'No timer' : `${Math.floor(timeLeftSeconds / 60)}:${String(timeLeftSeconds % 60).padStart(2, '0')}`
  const isLowTime = timeLeftSeconds !== null && timeLeftSeconds <= 120
  const answeredCount = questions.filter((question) => selectionOverrides[question.id] || question.selectedOptionId || question.textAnswer || question.answered).length

  return (
    <StudentPortalLayout>
      <main className="student-quiz-page">
        <header className="student-quiz-header">
          <div>
            <p className="student-kicker">QUIZ ATTEMPT</p>
            <h1>{attempt.quizTitle || 'Quiz'}</h1>
            <p>{attempt.courseTitle || 'Course quiz'} · Attempt {attempt.attemptNumber || 1}</p>
            <p>{attempt.remainingAttempts ?? 0} attempts remaining · {attempt.totalMarks} marks · Pass: {attempt.passingPercentage}%</p>
            {attempt.instructions && <p>{attempt.instructions}</p>}
          </div>
          <div className="student-quiz-status">
            <span><ListChecks size={16} /> {questions.length} questions</span>
            <span className={isLowTime ? 'student-quiz-status warning' : ''}><Clock3 size={16} /> {attempt.expiresAt ? `Time left: ${timeLabel}` : 'No timer'}</span>
          </div>
        </header>

        <section className="student-quiz-layout">
          <aside className="student-quiz-sidebar">
            <div className="student-quiz-sidebar-card">
              <h3>Questions</h3>
              <div className="student-question-palette">
                {questions.map((question, index) => {
                  const answered = Boolean(selectionOverrides[question.id] || question.selectedOptionId || question.textAnswer || question.answered)
                  return (
                    <button
                      key={question.id}
                      type="button"
                      className={`student-palette-item ${index === currentIndex ? 'active' : ''} ${answered ? 'answered' : ''}`}
                      onClick={() => setCurrentIndex(index)}
                      aria-label={`Question ${index + 1}, ${answered ? 'answered' : 'unanswered'}`}
                      aria-current={index === currentIndex ? 'step' : undefined}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
              <button type="button" className="button button-primary student-submit-button" onClick={() => handleSubmit()} disabled={submitting || saving}>
                {submitting ? 'Submitting…' : 'Submit Quiz'}
              </button>
            </div>
          </aside>

          <section className="student-quiz-card">
            {currentQuestion && (
              <>
                <div className="student-question-header">
                  <span className="student-question-label">Question {currentIndex + 1}</span>
                  <strong>{currentQuestion.marks || 0} marks</strong>
                </div>
                <h2>{currentQuestion.prompt}</h2>

                {currentQuestion.type === 'short_answer' ? (
                  <label className="student-short-answer-field">
                    <span>Your answer</span>
                    <textarea rows={4} value={selectionOverrides[currentQuestion.id] ?? currentQuestion.textAnswer ?? ''} onChange={(event) => setSelectionOverrides((current) => ({ ...current, [currentQuestion.id]: event.target.value }))} onBlur={(event) => { if (event.target.value.trim()) updateAnswer(event.target.value) }} aria-label={`Your answer for question ${currentIndex + 1}`} />
                  </label>
                ) : <fieldset className="student-options-list">
                  <legend className="visually-hidden">Choose an answer for question {currentIndex + 1}</legend>
                  {currentQuestion.options?.map((option) => {
                    const selectedOptionId = selectionOverrides[currentQuestion.id] ?? currentQuestion.selectedOptionId
                    const isSelected = String(option.id) === String(selectedOptionId ?? '')
                    return (
                      <label key={option.id} className={`student-option ${isSelected ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          checked={isSelected}
                          onChange={() => updateAnswer(option.id)}
                          aria-label={option.text}
                        />
                        <span>{option.text}</span>
                      </label>
                    )
                  })}
                </fieldset>}

                <div className="student-question-actions">
                  <button type="button" className="button button-outline" onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0}>
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span className="student-save-status" role="status" aria-live="polite">{saving ? 'Saving answer…' : saveError ? 'Answer not saved' : 'Answer saved'}</span>
                  <button type="button" className="button button-primary" onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))} disabled={currentIndex === questions.length - 1}>
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}
          </section>
        </section>

        {saveError && (
          <div className="student-quiz-warning is-critical" role="alert">
            <span>{saveError}</span>
            <button type="button" className="button button-outline" onClick={() => updateAnswer(selectionOverrides[currentQuestion?.id])} disabled={saving || !currentQuestion}>Retry save</button>
          </div>
        )}

        <div className={`student-quiz-warning ${isLowTime ? 'is-critical' : ''}`}>
          <AlertTriangle size={18} />
          <span>{isLowTime ? `Time is running low. You have ${timeLabel} remaining.` : 'Correct answers are hidden during the quiz and are revealed only after the result is finalized.'}</span>
        </div>

        <div className="student-quiz-footer">
          <Link className="button button-outline" to={courseSlug ? `/student/learn/${courseSlug}` : '/student/my-courses'}>Back to Course</Link>
          {autoSubmitFailed && <button type="button" className="button button-outline" onClick={() => handleSubmit({ automatic: true })} disabled={submitting}>Retry automatic submission</button>}
          <span>{answeredCount} of {questions.length} answered</span>
          <button type="button" className="button button-primary" onClick={() => handleSubmit()} disabled={submitting || saving || Boolean(saveError)}>{submitting ? 'Submitting…' : 'Finish Quiz'}</button>
        </div>
      </main>
    </StudentPortalLayout>
  )
}

export default QuizAttempt
