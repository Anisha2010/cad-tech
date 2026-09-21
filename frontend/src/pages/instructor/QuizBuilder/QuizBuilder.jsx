import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Save, Send, ArrowLeft } from 'lucide-react'
import QuestionEditor from '../../../components/instructor/assessment/QuestionEditor.jsx'
import QuizSettings from '../../../components/instructor/assessment/QuizSettings.jsx'
import { createInstructorQuiz, getInstructorQuiz, updateInstructorQuiz, addQuizQuestion, updateQuizQuestion, reorderQuizQuestions, deleteQuizQuestion, submitInstructorQuizForReview } from '../../../services/instructorAssessmentService.js'
import './QuizBuilder.css'

const makeNewQuestion = (type = 'multiple_choice') => ({
  id: crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now()}`,
  type,
  prompt: '',
  options: type === 'multiple_choice' ? [
    { id: crypto.randomUUID ? crypto.randomUUID() : `o-${Date.now()}`, text: '' },
    { id: crypto.randomUUID ? crypto.randomUUID() : `o-${(Date.now() + 1)}`, text: '' }
  ] : [
    { id: crypto.randomUUID ? crypto.randomUUID() : `true-opt-${Date.now()}`, text: 'True' },
    { id: crypto.randomUUID ? crypto.randomUUID() : `false-opt-${Date.now() + 1}`, text: 'False' }
  ],
  correctOptionId: type === 'multiple_choice' ? null : (crypto.randomUUID ? crypto.randomUUID() : `true-opt-${Date.now()}`),
  explanation: '',
  marks: 1,
  order: 0
})

function QuizBuilder() {
  const { courseId, quizId } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    instructions: '',
    passingPercentage: 70,
    timeLimitMinutes: null,
    maximumAttempts: 1,
    shuffleQuestions: false,
    questions: []
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!courseId || !quizId || quizId === 'new') return
    const loadQuiz = async () => {
      try {
        const response = await getInstructorQuiz(courseId, quizId)
        setQuiz({
          ...response.assessment,
          questions: Array.isArray(response.assessment?.questions) ? response.assessment.questions : []
        })
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load quiz.')
      }
    }
    loadQuiz()
  }, [courseId, quizId])

  const totalMarks = useMemo(() => (quiz.questions || []).reduce((sum, question) => sum + (Number(question.marks) || 0), 0), [quiz.questions])

  const saveDraft = async () => {
    if (!courseId) return
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      if (quizId && quizId !== 'new') {
        const response = await updateInstructorQuiz(courseId, quizId, { ...quiz, questions: quiz.questions })
        setQuiz({ ...quiz, ...response.assessment })
        setMessage('Draft saved.')
      } else {
        const response = await createInstructorQuiz(courseId, { ...quiz, questions: quiz.questions })
        setMessage('Quiz draft created.')
        navigate(`/instructor/courses/${courseId}/quizzes/${response.assessment.id}/edit`, { replace: true })
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save quiz draft.')
    } finally {
      setIsSaving(false)
    }
  }

  const addQuestion = async () => {
    const next = makeNewQuestion('multiple_choice')
    if (quizId && quizId !== 'new') {
      try {
        const response = await addQuizQuestion(courseId, quizId, next)
        setQuiz({ ...quiz, questions: response.assessment.questions })
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to add question.')
      }
      return
    }
    setQuiz((current) => ({ ...current, questions: [...(current.questions || []), next] }))
  }

  const updateQuestion = (updatedQuestion) => {
    setQuiz((current) => ({
      ...current,
      questions: (current.questions || []).map((question) => String(question.id) === String(updatedQuestion.id) ? updatedQuestion : question)
    }))
  }

  const persistQuestion = async (updatedQuestion) => {
    if (!quizId || quizId === 'new') return
    try {
      const response = await updateQuizQuestion(courseId, quizId, updatedQuestion.id, updatedQuestion)
      setQuiz((current) => ({ ...current, questions: response.assessment.questions }))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update question.')
    }
  }

  const handleQuestionChange = (question) => {
    updateQuestion(question)
    persistQuestion(question)
  }

  const moveQuestion = async ({ id, direction }) => {
    if (!quizId || quizId === 'new') return
    const ordered = [...(quiz.questions || [])]
    const index = ordered.findIndex((question) => String(question.id) === String(id))
    if (index < 0) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= ordered.length) return
    const [item] = ordered.splice(index, 1)
    ordered.splice(targetIndex, 0, item)
    const orderedIds = ordered.map((question) => question.id)
    try {
      const response = await reorderQuizQuestions(courseId, quizId, orderedIds)
      setQuiz((currentQuiz) => ({ ...currentQuiz, questions: response.assessment.questions }))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to reorder questions.')
    }
  }

  const deleteQuestion = async (questionId) => {
    if (!quizId || quizId === 'new') {
      setQuiz((current) => ({ ...current, questions: (current.questions || []).filter((question) => question.id !== questionId) }))
      return
    }
    try {
      const response = await deleteQuizQuestion(courseId, quizId, questionId)
      setQuiz({ ...quiz, questions: response.assessment.questions })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to remove question.')
    }
  }

  const submitReview = async () => {
    if (!quizId || quizId === 'new') {
      setError('Create the quiz draft before submitting it for review.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      const response = await submitInstructorQuizForReview(courseId, quizId)
      setQuiz({ ...quiz, ...response.assessment })
      setMessage('Quiz submitted for review.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit this quiz for review.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="assessment-builder-page">
      <header className="assessment-builder-header">
        <button type="button" className="button button-secondary" onClick={() => navigate(`/instructor/courses/${courseId}/assessments`)}><ArrowLeft size={16} /> Back</button>
        <div>
          <p className="admin-kicker">QUIZ BUILDER</p>
          <h1>{quizId && quizId !== 'new' ? 'Edit quiz' : 'New quiz'}</h1>
        </div>
      </header>

      {message && <p className="assessment-success" aria-live="polite">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <section className="assessment-builder-panel">
        <QuizSettings values={quiz} onChange={(field, value) => setQuiz((current) => ({ ...current, [field]: value }))} />
      </section>

      <section className="assessment-builder-panel">
        <div className="assessment-panel-heading">
          <h2>Questions</h2>
          <button type="button" className="button button-secondary" onClick={addQuestion}><Plus size={16} /> Add Question</button>
        </div>
        <div className="assessment-total-marks">Calculated total marks: <strong>{totalMarks}</strong></div>
        {(quiz.questions || []).map((question, index) => (
          <QuestionEditor
            key={question.id || `${index}-question`}
            question={question}
            onChange={handleQuestionChange}
            onDelete={() => deleteQuestion(question.id)}
            onMoveUp={() => moveQuestion({ id: question.id, direction: 'up' })}
            onMoveDown={() => moveQuestion({ id: question.id, direction: 'down' })}
            onDuplicate={() => {
              const duplicate = { ...question, id: crypto.randomUUID ? crypto.randomUUID() : `duplicate-${Date.now()}`, options: (question.options || []).map((option) => ({ ...option, id: crypto.randomUUID ? crypto.randomUUID() : `${option.id}-copy` })), correctOptionId: question.correctOptionId }
              setQuiz((current) => ({ ...current, questions: [...(current.questions || []), duplicate] }))
            }}
          />
        ))}
      </section>

      <footer className="assessment-builder-actions">
        <button type="button" className="button button-secondary" onClick={saveDraft} disabled={isSaving}>
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Draft'}
        </button>
        <button type="button" className="button button-primary" onClick={submitReview} disabled={isSubmitting || (quiz.reviewStatus === 'pending')}>
          <Send size={16} /> {isSubmitting ? 'Submitting...' : quiz.reviewStatus === 'pending' ? 'Pending Review' : 'Submit for Review'}
        </button>
      </footer>
    </main>
  )
}

export default QuizBuilder
