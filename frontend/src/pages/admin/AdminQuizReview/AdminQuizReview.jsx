import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAdminQuizReview, approveAdminQuizReview, requestAdminQuizChanges, publishAdminQuiz, unpublishAdminQuiz, archiveAdminQuiz } from '../../../services/adminAssessmentService.js'

function AdminQuizReview() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [course, setCourse] = useState(null)
  const [instructor, setInstructor] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const response = await getAdminQuizReview(quizId)
      setQuiz(response.assessment)
      setCourse(response.course)
      setInstructor(response.instructor)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load quiz review.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (quizId) load() }, [quizId])

  const action = async (fn) => {
    try {
      await fn()
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Action failed.')
    }
  }

  if (loading) return <main className="admin-page"><p className="admin-state">Loading quiz review...</p></main>
  if (!quiz) return <main className="admin-page"><p className="admin-error" role="alert">{error || 'Quiz not found.'}</p></main>

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">QUIZ REVIEW</p>
          <h1>{quiz.title}</h1>
          <p>{course?.title || 'Course'} • {instructor?.name || 'Instructor'}</p>
        </div>
      </header>

      <section className="admin-panel">
        <h3>Quiz settings</h3>
        <p>Passing: {quiz.passingPercentage}% • Attempts: {quiz.maximumAttempts} • Time limit: {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} mins` : 'None'} • Status: {quiz.reviewStatus}</p>
        <p>{quiz.instructions || 'No instructions provided.'}</p>
      </section>

      <section className="admin-panel">
        <h3>Questions</h3>
        {quiz.questions?.map((question, index) => (
          <article key={question.id} className="assessment-review-question">
            <h4>Question {index + 1}</h4>
            <p>{question.prompt}</p>
            <ul>
              {question.options?.map((option) => <li key={option.id}>{option.text}{String(option.id) === String(question.correctOptionId) ? ' • Correct answer' : ''}</li>)}
            </ul>
            <small>Marks: {question.marks}</small>
          </article>
        ))}
      </section>

      {quiz.reviewFeedback && <section className="admin-panel"><h3>Feedback</h3><p>{quiz.reviewFeedback}</p></section>}

      <section className="admin-panel">
        <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Request change feedback" rows={4} />
        <div className="assessment-builder-actions">
          <button type="button" className="button button-primary" onClick={() => action(() => approveAdminQuizReview(quizId))}>Approve</button>
          <button type="button" className="button button-secondary" onClick={() => action(() => requestAdminQuizChanges(quizId, feedback))}>Request Changes</button>
          <button type="button" className="button button-secondary" onClick={() => action(() => publishAdminQuiz(quizId))}>Publish</button>
          <button type="button" className="button button-secondary" onClick={() => action(() => unpublishAdminQuiz(quizId))}>Unpublish</button>
          <button type="button" className="button button-secondary" onClick={() => action(() => archiveAdminQuiz(quizId).then(() => navigate('/admin/assessments')))}>Archive</button>
        </div>
      </section>
    </main>
  )
}

export default AdminQuizReview
