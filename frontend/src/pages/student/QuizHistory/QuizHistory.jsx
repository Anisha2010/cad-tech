import { BookOpen, Clock3, Eye, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StudentPortalLayout from '../../../components/student/StudentPortalLayout.jsx'
import { getQuizHistory } from '../../../services/studentQuizService.js'
import './QuizHistory.css'

function QuizHistory() {
  const [attempts, setAttempts] = useState([])
  const [courseId, setCourseId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getQuizHistory(courseId || null)
      setAttempts(result)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load your quiz history.')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    load()
  }, [load])

  const courses = [...new Map(attempts.map((attempt) => [attempt.courseId, { id: attempt.courseId, title: attempt.courseTitle }])).values()]

  return (
    <StudentPortalLayout>
    <main className="student-history-page">
      <header className="student-history-header">
        <div>
          <p className="student-kicker">QUIZ HISTORY</p>
          <h1>My Quiz Attempts</h1>
        </div>
        <label className="student-history-filter">Course
          <select value={courseId} onChange={(event) => setCourseId(event.target.value)} aria-label="Filter quiz history by course">
            <option value="">All courses</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
      </header>

      {loading ? (
        <div className="student-history-state" role="status" aria-live="polite">Loading quiz history…</div>
      ) : error ? (
        <div className="student-history-state" role="alert"><strong>{error}</strong><button type="button" className="button button-primary" onClick={load}><RefreshCw size={16} /> Try again</button></div>
      ) : attempts.length === 0 ? (
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
                  <span>{attempt.status === 'expired' ? 'Expired' : 'Submitted'}</span>
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
    </StudentPortalLayout>
  )
}

export default QuizHistory
