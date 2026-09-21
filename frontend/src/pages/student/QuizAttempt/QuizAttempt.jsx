import { AlertTriangle, Clock3, CheckCircle2, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
  const [submitting, setSubmitting] = useState(false)

  const loadAttempt = async () => {
    setLoading(true)
    setError('')
    try {
      const nextAttempt = attemptId ? await getQuizAttempt(attemptId) : await startQuizAttempt(quizId)
      setAttempt(nextAttempt)
      setCurrentIndex(0)
      if (nextAttempt?.id && !attemptId) {
        navigate(`/student/quizzes/${quizId}/attempt/${nextAttempt.id}`, { replace: true })
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load this quiz attempt.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!quizId) return
    loadAttempt()
  }, [quizId, attemptId])

  const questions = useMemo(() => attempt?.questions ?? [], [attempt])
  const currentQuestion = questions[currentIndex] ?? null

  const updateAnswer = async (selectedOptionId) => {
    if (!attempt?.id || !currentQuestion) return

    setSaving(true)
    try {
      const saved = await saveQuizAnswer(attempt.id, {
        questionId: currentQuestion.id,
        selectedOptionId
      })
      setAttempt((previous) => {
        if (!previous) return previous
        return {
          ...previous,
          questions: previous.questions.map((question) => question.id === currentQuestion.id ? { ...question, selectedOptionId: saved?.selectedOptionId ?? selectedOptionId } : question)
        }
      })
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to save this answer.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!attempt?.id) return
    const unanswered = questions.filter((question) => !question.selectedOptionId && !question.answered).length
    const confirmed = window.confirm(`Submit quiz?\nYou still have ${unanswered} unanswered questions. Answers cannot be changed after submission.`)
    if (!confirmed) return

    setSubmitting(true)
    try {
      const result = await submitQuizAttempt(attempt.id)
      navigate(`/student/quizzes/${quizId}/results/${result.id || attempt.id}`)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to submit this quiz right now.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <main className="student-quiz-page"><div className="student-page-loading">Loading quiz…</div></main>
  }

  if (error) {
    return <main className="student-quiz-page"><div className="student-page-error"><strong>{error}</strong><button type="button" className="button button-primary" onClick={loadAttempt}>Try again</button></div></main>
  }

  if (!attempt || !questions.length) {
    return <main className="student-quiz-page"><div className="student-page-empty"><h2>No quiz questions available</h2><Link className="button button-primary" to={courseSlug ? `/student/learn/${courseSlug}` : '/student/my-courses'}>Back to course</Link></div></main>
  }

  return (
    <main className="student-quiz-page">
      <header className="student-quiz-header">
        <div>
          <p className="student-kicker">QUIZ ATTEMPT</p>
          <h1>{attempt.quizTitle || 'Quiz'}</h1>
          <p>{attempt.courseId ? 'Course quiz' : 'Student assessment'} • Attempt {attempt.attemptNumber || 1}</p>
        </div>
        <div className="student-quiz-status">
          <span><ListChecks size={16} /> {questions.length} questions</span>
          <span><Clock3 size={16} /> {attempt.expiresAt ? 'Timer active' : 'No timer'}</span>
        </div>
      </header>

      <section className="student-quiz-layout">
        <aside className="student-quiz-sidebar">
          <div className="student-quiz-sidebar-card">
            <h3>Questions</h3>
            <div className="student-question-palette">
              {questions.map((question, index) => {
                const answered = Boolean(question.selectedOptionId || question.answered)
                return (
                  <button
                    key={question.id}
                    type="button"
                    className={`student-palette-item ${index === currentIndex ? 'active' : ''} ${answered ? 'answered' : ''}`}
                    onClick={() => setCurrentIndex(index)}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>
            <button type="button" className="button button-primary student-submit-button" onClick={handleSubmit} disabled={submitting}>
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

              <div className="student-options-list">
                {currentQuestion.options?.map((option) => {
                  const isSelected = String(option.id) === String(currentQuestion.selectedOptionId ?? '')
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
              </div>

              <div className="student-question-actions">
                <button type="button" className="button button-outline" onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0}>
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="student-save-status">{saving ? 'Saving…' : 'Saved locally'}</span>
                <button type="button" className="button button-primary" onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))} disabled={currentIndex === questions.length - 1}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}
        </section>
      </section>

      <div className="student-quiz-warning">
        <AlertTriangle size={18} />
        <span>Correct answers are hidden during the quiz and are revealed only after the result is finalized.</span>
      </div>

      <div className="student-quiz-footer">
        <Link className="button button-outline" to={courseSlug ? `/student/learn/${courseSlug}` : '/student/my-courses'}>Back to Course</Link>
        <button type="button" className="button button-primary" onClick={handleSubmit} disabled={submitting}>Finish Quiz</button>
      </div>
    </main>
  )
}

export default QuizAttempt
