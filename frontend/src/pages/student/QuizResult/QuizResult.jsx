import { CheckCircle2, Clock3, RotateCcw, Trophy, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getQuizResult } from '../../../services/studentQuizService.js'
import './QuizResult.css'

function QuizResult() {
  const { quizId, attemptId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadResult = async () => {
      if (!quizId || !attemptId) return
      setLoading(true)
      setError('')
      try {
        const nextResult = await getQuizResult(quizId, attemptId)
        setResult(nextResult)
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Unable to load this result.')
      } finally {
        setLoading(false)
      }
    }

    loadResult()
  }, [quizId, attemptId])

  if (loading) {
    return <main className="student-result-page"><div className="student-result-state">Loading results…</div></main>
  }

  if (error) {
    return <main className="student-result-page"><div className="student-result-state"><strong>{error}</strong><button type="button" className="button button-primary" onClick={() => navigate(-1)}>Go back</button></div></main>
  }

  if (!result) {
    return <main className="student-result-page"><div className="student-result-state">No result was found for this attempt.</div></main>
  }

  const isPassed = Boolean(result.passed)

  return (
    <main className="student-result-page">
      <section className="student-result-card">
        <div className="student-result-header">
          <div>
            <p className="student-kicker">RESULT</p>
            <h1>{result.quizTitle}</h1>
          </div>
          <div className={`student-result-status ${isPassed ? 'passed' : 'failed'}`}>
            {isPassed ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
            {isPassed ? 'Passed' : 'Not Passed'}
          </div>
        </div>

        <div className="student-result-grid">
          <div className="student-stat-box">
            <Trophy size={18} />
            <span>Earned marks</span>
            <strong>{result.earnedMarks}/{result.totalMarks}</strong>
          </div>
          <div className="student-stat-box">
            <Clock3 size={18} />
            <span>Percentage</span>
            <strong>{result.percentage}%</strong>
          </div>
          <div className="student-stat-box">
            <CheckCircle2 size={18} />
            <span>Passing requirement</span>
            <strong>{result.passingPercentage}%</strong>
          </div>
        </div>

        <div className="student-result-meta">
          <p><strong>Attempt:</strong> #{result.attemptNumber}</p>
          <p><strong>Submitted:</strong> {result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'N/A'}</p>
          <p><strong>Remaining attempts:</strong> {result.remainingAttempts ?? 0}</p>
        </div>

        {result.reviewAllowed && result.questions?.length ? (
          <div className="student-review-panel">
            <h3>Question review</h3>
            {result.questions.map((question, index) => (
              <div key={question.id} className="student-review-item">
                <p><strong>{index + 1}. {question.prompt}</strong></p>
                <p>Selected: {question.selectedOptionId ? question.selectedOptionId : 'Unanswered'}</p>
                {question.correctOptionId && <p>Correct option: {question.correctOptionId}</p>}
                {question.explanation && <p>{question.explanation}</p>}
              </div>
            ))}
          </div>
        ) : null}

        {!result.reviewAllowed && (
          <div className="student-review-panel neutral">
            <p>Correct answers will be available after you pass or use all attempts.</p>
          </div>
        )}

        <div className="student-result-actions">
          <Link className="button button-primary" to="/student/quiz-history">View Quiz History</Link>
          <Link className="button button-outline" to="/student/my-courses">Back to Course</Link>
          {result.remainingAttempts > 0 && (
            <button type="button" className="button button-secondary" onClick={() => navigate(`/student/learn/${result.courseSlug || 'my-courses'}/quiz/${quizId}`)}>
              <RotateCcw size={16} /> Retry Quiz
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

export default QuizResult
