import { BookOpen, CheckCircle2, Clock3, Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getQuizHistory } from '../../../services/studentQuizService.js'
import './QuizHistory.css'

function QuizHistory() {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await getQuizHistory()
        setAttempts(result)
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Unable to load your quiz history.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return <main className="student-history-page"><div className="student-history-state">Loading quiz history…</div></main>
  }

  if (error) {
    return <main className="student-history-page"><div className="student-history-state"><strong>{error}</strong></div></main>
  }

  return (
    <main className="student-history-page">
      <header className="student-history-header">
        <div>
          <p className="student-kicker">QUIZ HISTORY</p>
          <h1>My Quiz Attempts</h1>
        </div>
      </header>

      {attempts.length === 0 ? (
        <section className="student-history-empty">
          <BookOpen size={28} />
          <h2>No quizzes attempted yet</h2>
          <p>Your quiz submissions will appear here once you begin a course assessment.</p>
        </section>
      ) : (
        <div className="student-history-list">
          {attempts.map((attempt) => (
            <article key={attempt.id} className="student-history-card">
              <div>
                <p className="student-history-course">{attempt.courseTitle || 'Course'}</p>
                <h3>{attempt.quizTitle}</h3>
                <div className="student-history-meta">
                  <span>Attempt #{attempt.attemptNumber}</span>
                  <span>{attempt.totalMarks} marks</span>
                  <span>{attempt.status}</span>
                </div>
              </div>
              <div className="student-history-result">
                <div className="student-history-score">
                  <strong>{attempt.earnedMarks ?? 0}</strong>
                  <span>{attempt.percentage ?? 0}%</span>
                </div>
                <div className={`student-history-badge ${attempt.passed ? 'passed' : 'failed'}`}>
                  {attempt.passed ? 'Passed' : 'Not Passed'}
                </div>
                <div className="student-history-date">
                  <Clock3 size={14} />
                  {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'Pending'}
                </div>
                <Link className="button button-primary" to={`/student/quizzes/${attempt.quizId}/results/${attempt.id}`}>
                  <Eye size={15} /> View Result
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

export default QuizHistory
