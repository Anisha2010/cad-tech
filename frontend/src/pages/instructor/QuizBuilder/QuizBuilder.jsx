import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BookOpenText, CheckCircle2, FileQuestion, Plus, Save, Send } from 'lucide-react'
import QuestionEditor from '../../../components/instructor/assessment/QuestionEditor.jsx'
import QuizSettings from '../../../components/instructor/assessment/QuizSettings.jsx'
import { fetchInstructorCourse, fetchInstructorCurriculum } from '../../../services/instructorService.js'
import { createInstructorQuiz, getInstructorQuiz, updateInstructorQuiz, addQuizQuestion, updateQuizQuestion, reorderQuizQuestions, deleteQuizQuestion, submitInstructorQuizForReview } from '../../../services/instructorAssessmentService.js'
import './QuizBuilder.css'

const makeOptionId = () => crypto.randomUUID
  ? crypto.randomUUID().replaceAll('-', '').slice(0, 24)
  : `${Date.now().toString(16).padStart(12, '0')}${Math.random().toString(16).slice(2, 14)}`

const makeNewQuestion = (type = 'multiple_choice', order = 0) => ({
  id: crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now()}`,
  type,
  prompt: '',
  options: type === 'multiple_choice' ? [
    { id: makeOptionId(), text: '' },
    { id: makeOptionId(), text: '' }
  ] : [
    { id: makeOptionId(), text: 'True' },
    { id: makeOptionId(), text: 'False' }
  ],
  correctOptionId: type === 'true_false' ? null : null,
  correctAnswer: type === 'short_answer' ? '' : null,
  explanation: '',
  marks: 1,
  order
})

function QuizBuilder() {
  const { courseId, quizId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const routeLessonId = searchParams.get('lessonId')
  const [courseTitle, setCourseTitle] = useState('')
  const [lessons, setLessons] = useState([])
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
  const [validationErrors, setValidationErrors] = useState({})
  const [savingQuestionId, setSavingQuestionId] = useState(null)
  const savingQuestionRef = useRef(null)
  const [dirtyQuestionIds, setDirtyQuestionIds] = useState([])
  const [savedQuizId, setSavedQuizId] = useState(quizId && quizId !== 'new' ? quizId : null)

  useEffect(() => {
    if (!courseId || !quizId || quizId === 'new') return
    const loadQuiz = async () => {
      try {
        const response = await getInstructorQuiz(courseId, quizId)
        setQuiz({
          ...response.assessment,
          questions: Array.isArray(response.assessment?.questions) ? response.assessment.questions : []
        })
        setDirtyQuestionIds([])
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load quiz.')
      }
    }
    loadQuiz()
  }, [courseId, quizId])

  useEffect(() => {
    if (!courseId) return
    Promise.allSettled([fetchInstructorCourse(courseId), fetchInstructorCurriculum(courseId)]).then(([courseResult, curriculumResult]) => {
      if (courseResult.status === 'fulfilled') setCourseTitle(courseResult.value?.course?.title || '')
      if (curriculumResult.status === 'fulfilled') {
        const sections = curriculumResult.value?.curriculum?.sections || []
        setLessons(sections.flatMap((section) => (section.lessons || []).filter((lesson) => !lesson.archivedAt)))
      }
    })
  }, [courseId])

  const totalMarks = useMemo(() => (quiz.questions || []).reduce((sum, question) => sum + (Number(question.marks) || 0), 0), [quiz.questions])
  const lessonId = routeLessonId || quiz.lessonId || ''
  const lessonTitle = lessons.find((lesson) => String(lesson.id) === String(lessonId))?.title || (lessonId ? 'Selected lesson' : 'No lesson selected')
  const isEditing = Boolean(quizId && quizId !== 'new')
  const hasSavedQuiz = Boolean(savedQuizId)
  const statusLabel = quiz.publicationStatus === 'published' ? 'Published'
    : quiz.publicationStatus === 'archived' ? 'Archived'
      : quiz.reviewStatus === 'pending' ? 'Pending Review'
        : quiz.reviewStatus === 'changes_requested' ? 'Changes Requested'
          : quiz.reviewStatus === 'approved' ? 'Approved' : 'Draft'

  const validateQuiz = () => {
    const nextErrors = {}
    if (!quiz.title.trim()) nextErrors.title = 'Enter a quiz title.'
    if (!Number.isFinite(Number(quiz.passingPercentage)) || Number(quiz.passingPercentage) < 0 || Number(quiz.passingPercentage) > 100) nextErrors.passingPercentage = 'Enter a percentage from 0 to 100.'
    if (!Number.isInteger(Number(quiz.maximumAttempts)) || Number(quiz.maximumAttempts) <= 0) nextErrors.maximumAttempts = 'Enter a positive whole number.'
    if (quiz.timeLimitMinutes !== null && quiz.timeLimitMinutes !== '' && (!Number.isInteger(Number(quiz.timeLimitMinutes)) || Number(quiz.timeLimitMinutes) <= 0)) nextErrors.timeLimitMinutes = 'Enter a positive whole number or leave empty.'
      ; (quiz.questions || []).forEach((question, index) => {
        const questionKey = String(question.id || index)
        if (!question.prompt?.trim()) nextErrors[`question-${questionKey}-prompt`] = `Question ${index + 1} needs a prompt.`
        if (!Number.isInteger(Number(question.marks)) || Number(question.marks) <= 0) nextErrors[`question-${questionKey}-marks`] = 'Marks must be a positive whole number.'
        if (question.type === 'multiple_choice') {
          if ((question.options || []).length < 2) nextErrors[`question-${questionKey}-options`] = 'Add at least two answer options.'
          else if (question.options.some((option) => !option.text?.trim())) nextErrors[`question-${questionKey}-options`] = 'Complete every answer option.'
          if (!question.correctOptionId) nextErrors[`question-${questionKey}-correct`] = 'Choose the correct answer.'
        } else if (question.type === 'true_false') {
          if (!question.correctOptionId) nextErrors[`question-${questionKey}-correct`] = 'Choose True or False as the correct answer.'
        } else if (question.type === 'short_answer' && !question.correctAnswer?.trim()) {
          nextErrors[`question-${questionKey}-correctAnswer`] = 'Enter the expected short answer.'
        }
      })
    setValidationErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const saveDraft = async () => {
    if (!courseId) return
    if (savingQuestionRef.current) return
    if (!validateQuiz()) {
      setError('Review the highlighted fields before saving.')
      return
    }
    const payload = { ...quiz, lessonId: lessonId || null, questions: quiz.questions.map((question, order) => ({ ...question, order })) }
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      if (savedQuizId) {
        const initialAssessment = (await updateInstructorQuiz(courseId, savedQuizId, payload)).assessment
        const pendingQuestions = quiz.questions.filter((question) => !isPersistedQuestion(question) || dirtyQuestionIds.includes(String(question.id)))
        const assessment = await pendingQuestions.reduce(async (assessmentPromise, question, pendingIndex) => {
          await assessmentPromise
          const order = quiz.questions.findIndex((item) => String(item.id) === String(question.id))
          const payloadForQuestion = { ...question, order }
          const questionResponse = isPersistedQuestion(question)
            ? await updateQuizQuestion(courseId, savedQuizId, question.id, payloadForQuestion)
            : await addQuizQuestion(courseId, savedQuizId, payloadForQuestion)
          const nextAssessment = questionResponse.assessment
          const remaining = pendingQuestions.slice(pendingIndex + 1)
          setQuiz((current) => ({ ...current, ...nextAssessment, questions: [...nextAssessment.questions, ...remaining] }))
          setDirtyQuestionIds((current) => current.filter((id) => String(id) !== String(question.id)))
          return nextAssessment
        }, Promise.resolve(initialAssessment))
        setQuiz((current) => ({ ...current, ...assessment }))
        setMessage('Draft saved.')
      } else {
        const response = await createInstructorQuiz(courseId, payload)
        setSavedQuizId(response.assessment.id)
        setQuiz(response.assessment)
        setDirtyQuestionIds([])
        setMessage('Quiz draft created.')
        navigate(`/instructor/courses/${courseId}/quizzes/${response.assessment.id}/edit`, { replace: true })
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save quiz draft.')
    } finally {
      setIsSaving(false)
    }
  }

  const addQuestion = () => {
    const next = makeNewQuestion('multiple_choice', quiz.questions.length)
    setError('')
    setQuiz((current) => ({ ...current, questions: [...(current.questions || []), next] }))
  }

  const updateQuestion = (updatedQuestion) => {
    setQuiz((current) => ({
      ...current,
      questions: (current.questions || []).map((question) => String(question.id) === String(updatedQuestion.id) ? updatedQuestion : question)
    }))
  }

  const persistQuestion = async (updatedQuestion) => {
    updateQuestion(updatedQuestion)
  }

  const handleQuestionChange = (question) => {
    persistQuestion(question)
    if (isPersistedQuestion(question)) {
      setDirtyQuestionIds((current) => current.includes(String(question.id)) ? current : [...current, String(question.id)])
    }
  }

  const isPersistedQuestion = (question) => /^[a-f\d]{24}$/i.test(String(question?.id || ''))

  const cancelQuestion = (question) => {
    if (isPersistedQuestion(question)) {
      setError('')
      return
    }
    setQuiz((current) => ({
      ...current,
      questions: (current.questions || []).filter((item) => String(item.id) !== String(question.id))
    }))
    setValidationErrors((current) => Object.fromEntries(Object.entries(current).filter(([fieldKey]) => !fieldKey.startsWith(`question-${String(question.id)}-`))))
    setError('')
  }

  const saveQuestion = async (question, index) => {
    const questionKey = String(question.id || index)
    const questionErrors = {}
    if (!question.prompt?.trim()) questionErrors[`question-${questionKey}-prompt`] = 'Question text cannot be empty.'
    if (!Number.isInteger(Number(question.marks)) || Number(question.marks) <= 0) questionErrors[`question-${questionKey}-marks`] = 'Marks must be a positive whole number.'
    if (question.type === 'multiple_choice') {
      if ((question.options || []).length < 2) questionErrors[`question-${questionKey}-options`] = 'MCQ questions require at least two options.'
      else if (question.options.some((option) => !option.text?.trim())) questionErrors[`question-${questionKey}-options`] = 'Complete every answer option.'
      if (!question.correctOptionId) questionErrors[`question-${questionKey}-correct`] = 'Select a valid correct answer.'
    } else if (question.type === 'true_false' && !question.correctOptionId) {
      questionErrors[`question-${questionKey}-correct`] = 'Select True or False as the correct answer.'
    } else if (question.type === 'short_answer' && !question.correctAnswer?.trim()) {
      questionErrors[`question-${questionKey}-correctAnswer`] = 'Enter the expected short answer.'
    }
    if (Object.keys(questionErrors).length) {
      setValidationErrors((current) => ({ ...current, ...questionErrors }))
      setError('Review the highlighted question fields before saving.')
      return
    }
    if (!savedQuizId) {
      setError('Save the quiz draft before saving its questions.')
      return
    }
    if (savingQuestionRef.current) return

    savingQuestionRef.current = question.id
    setSavingQuestionId(question.id)
    setError('')
    setMessage('')
    try {
      const response = isPersistedQuestion(question)
        ? await updateQuizQuestion(courseId, savedQuizId, question.id, question)
        : await addQuizQuestion(courseId, savedQuizId, { ...question, order: index })
      const remainingQuestions = (quiz.questions || []).filter((item) => String(item.id) !== String(question.id) && (!isPersistedQuestion(item) || dirtyQuestionIds.includes(String(item.id))))
      const remainingById = new Map(remainingQuestions.map((item) => [String(item.id), item]))
      const savedQuestionList = response.assessment.questions.map((item) => remainingById.get(String(item.id)) || item)
      const unsavedQuestions = remainingQuestions.filter((item) => !isPersistedQuestion(item))
      setQuiz((current) => ({ ...current, ...response.assessment, questions: [...savedQuestionList, ...unsavedQuestions] }))
      setDirtyQuestionIds((current) => current.filter((id) => String(id) !== String(question.id)))
      setValidationErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`question-${questionKey}-`))))
      setMessage('Question saved.')
    } catch (requestError) {
      const responseData = requestError.response?.data || {}
      const fieldErrors = responseData.errors || responseData.fieldErrors || {}
      const mappedErrors = Object.fromEntries(Object.entries(fieldErrors).map(([field, messageText]) => {
        const editorField = field === 'correctOptionId' ? 'correct' : field
        return [`question-${questionKey}-${editorField}`, messageText]
      }))
      setValidationErrors((current) => ({ ...current, ...mappedErrors }))
      setError(responseData.message || 'Unable to save question.')
    } finally {
      savingQuestionRef.current = null
      setSavingQuestionId(null)
    }
  }

  const moveQuestion = async ({ id, direction }) => {
    if (!savedQuizId) return
    const ordered = [...(quiz.questions || [])]
    const index = ordered.findIndex((question) => String(question.id) === String(id))
    if (index < 0) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= ordered.length) return
    const [item] = ordered.splice(index, 1)
    ordered.splice(targetIndex, 0, item)
    const orderedIds = ordered.map((question) => question.id)
    try {
      const response = await reorderQuizQuestions(courseId, savedQuizId, orderedIds)
      setQuiz((currentQuiz) => ({ ...currentQuiz, questions: response.assessment.questions }))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to reorder questions.')
    }
  }

  const deleteQuestion = async (questionId) => {
    if (!savedQuizId || !isPersistedQuestion({ id: questionId })) {
      setQuiz((current) => ({ ...current, questions: (current.questions || []).filter((question) => question.id !== questionId) }))
      return
    }
    try {
      const response = await deleteQuizQuestion(courseId, savedQuizId, questionId)
      setQuiz({ ...quiz, questions: response.assessment.questions })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to remove question.')
    }
  }

  const submitReview = async () => {
    if (!savedQuizId) {
      setError('Create the quiz draft before submitting it for review.')
      return
    }
    if (!validateQuiz()) {
      setError('Review the highlighted fields before submitting.')
      return
    }
    const unsavedQuestions = (quiz.questions || []).filter((question) => !isPersistedQuestion(question))
    if (unsavedQuestions.length || dirtyQuestionIds.length) {
      setError('Save each new or edited question before submitting the quiz for review.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      const response = await submitInstructorQuizForReview(courseId, savedQuizId)
      setQuiz({ ...quiz, ...response.assessment })
      setMessage('Quiz submitted for review.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit this quiz for review.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="instructor-quiz-builder">
      <nav className="instructor-quiz-breadcrumb" aria-label="Breadcrumb">
        <Link to="/instructor/courses">My Courses</Link><span aria-hidden="true">/</span>
        <Link to={`/instructor/courses/${courseId}/assessments`}>{courseTitle || 'Course'}</Link><span aria-hidden="true">/</span>
        <Link to={`/instructor/courses/${courseId}/assessments`}>Assessments</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{isEditing ? 'Edit Quiz' : 'Create Quiz'}</span>
      </nav>

      <header className="instructor-quiz-builder-header">
        <div className="instructor-quiz-heading-copy">
          <p className="admin-kicker">QUIZ BUILDER</p>
          <h1>{isEditing ? 'Edit Quiz' : 'Create Quiz'}</h1>
          <p>Configure quiz rules, add questions, and submit it for admin review.</p>
        </div>
        <div className="instructor-quiz-header-actions">
          <button type="button" className="instructor-quiz-button is-secondary" onClick={() => navigate(`/instructor/courses/${courseId}/assessments`)}>Cancel</button>
          <button type="button" className="instructor-quiz-button is-secondary" onClick={saveDraft} disabled={isSaving || isSubmitting || Boolean(savingQuestionId)}><Save size={16} /> {isSaving ? 'Saving...' : 'Save Draft'}</button>
          <button type="button" className="instructor-quiz-button is-primary" onClick={submitReview} disabled={isSaving || isSubmitting || Boolean(savingQuestionId) || quiz.reviewStatus === 'pending'}><Send size={16} /> {isSubmitting ? 'Submitting...' : quiz.reviewStatus === 'pending' ? 'Pending Review' : 'Submit for Review'}</button>
        </div>
      </header>

      <div className="instructor-quiz-live-region" aria-live="polite" aria-atomic="true">{message || (isSaving ? 'Saving...' : isSubmitting ? 'Submitting...' : '')}</div>
      {error && <p className="instructor-quiz-error" role="alert">{error}</p>}

      <div className="instructor-quiz-workspace">
        <div className="instructor-quiz-main-column">
          <section className="instructor-quiz-panel">
            <div className="instructor-quiz-panel-title"><span><FileQuestion size={18} /></span><div><h2>Quiz Details</h2><p>Set the name and learning context for this quiz.</p></div></div>
            <div className="instructor-quiz-details-grid">
              <label className={`instructor-quiz-field is-wide${validationErrors.title ? ' has-error' : ''}`} htmlFor="quiz-title"><span>Quiz title <b aria-hidden="true">*</b></span><input id="quiz-title" required aria-invalid={Boolean(validationErrors.title)} aria-describedby={validationErrors.title ? 'quiz-title-error' : undefined} value={quiz.title || ''} onChange={(event) => { setQuiz((current) => ({ ...current, title: event.target.value })); setValidationErrors((current) => ({ ...current, title: '' })) }} placeholder="e.g. Assembly fundamentals" />{validationErrors.title ? <small id="quiz-title-error" className="instructor-quiz-field-error">{validationErrors.title}</small> : <small>Use a clear title students can recognize.</small>}</label>
              <label className="instructor-quiz-field" htmlFor="quiz-course"><span>Course</span><input id="quiz-course" value={courseTitle || 'Loading course...'} disabled readOnly /><small>Course assignment is managed by your administrator.</small></label>
              <label className="instructor-quiz-field" htmlFor="quiz-lesson"><span>Associated lesson</span><input id="quiz-lesson" value={lessonTitle} disabled readOnly /></label>
              <label className="instructor-quiz-field is-wide" htmlFor="quiz-description"><span>Quiz description</span><textarea id="quiz-description" rows={3} value={quiz.description || ''} onChange={(event) => setQuiz((current) => ({ ...current, description: event.target.value }))} placeholder="Add a short overview of the quiz." /></label>
            </div>
          </section>

          <section className="instructor-quiz-panel">
            <div className="instructor-quiz-panel-title"><span><BookOpenText size={18} /></span><div><h2>Instructions</h2><p>Give learners any guidance they need before starting.</p></div></div>
            <label className="instructor-quiz-field" htmlFor="quiz-instructions"><span>Student instructions</span><textarea id="quiz-instructions" rows={4} value={quiz.instructions || ''} onChange={(event) => setQuiz((current) => ({ ...current, instructions: event.target.value }))} placeholder="Explain the expectations for this quiz." /></label>
          </section>

          <section className="instructor-quiz-panel instructor-quiz-questions-panel">
            <div className="instructor-quiz-questions-heading">
              <div><p className="admin-kicker">QUESTION BANK</p><h2>Questions</h2><p>{quiz.questions.length} questions <span aria-hidden="true">·</span> {totalMarks} total marks</p></div>
              <button type="button" className="instructor-quiz-button is-primary" onClick={addQuestion} disabled={isSaving || isSubmitting || Boolean(savingQuestionId)}><Plus size={17} /> Add Question</button>
            </div>
            {(quiz.questions || []).map((question, index) => (
              <QuestionEditor
                key={question.id || `${index}-question`}
                question={question}
                index={index}
                questionCount={quiz.questions.length}
                validationErrors={validationErrors}
                isEditing={isPersistedQuestion(question)}
                onValidationChange={(field) => setValidationErrors((current) => ({ ...current, [field]: '' }))}
                canReorder={hasSavedQuiz && isPersistedQuestion(question)}
                isSaving={Boolean(savingQuestionId)}
                isSaved={isPersistedQuestion(question)}
                onSave={() => saveQuestion(question, index)}
                onCancel={() => cancelQuestion(question)}
                onChange={handleQuestionChange}
                onDelete={() => deleteQuestion(question.id)}
                onMoveUp={() => moveQuestion({ id: question.id, direction: 'up' })}
                onMoveDown={() => moveQuestion({ id: question.id, direction: 'down' })}
                onDuplicate={() => {
                  const optionIdMap = new Map((question.options || []).map((option) => [String(option.id), makeOptionId()]))
                  const duplicate = { ...question, id: makeOptionId(), options: (question.options || []).map((option) => ({ ...option, id: optionIdMap.get(String(option.id)) })), correctOptionId: optionIdMap.get(String(question.correctOptionId)) || question.correctOptionId, order: current.questions.length }
                  setQuiz((current) => ({ ...current, questions: [...(current.questions || []), duplicate] }))
                }}
              />
            ))}
            {quiz.questions.length === 0 && <div className="instructor-quiz-no-questions"><FileQuestion size={22} /><p>No questions added yet.</p><span>Add your first question to begin building the quiz.</span></div>}
          </section>
        </div>

        <aside className="instructor-quiz-sidebar">
          <section className="instructor-quiz-panel instructor-quiz-status-panel">
            <div className="instructor-quiz-panel-title"><span><CheckCircle2 size={18} /></span><div><h2>Overview</h2><p>Quiz setup and review status.</p></div></div>
            <div className="instructor-quiz-context-list">
              <div><span>Status</span><strong className={`instructor-quiz-status-badge is-${statusLabel.toLowerCase().replaceAll(' ', '-')}`}>{statusLabel}</strong></div>
              <div><span>Course</span><strong>{courseTitle || 'Loading...'}</strong></div>
              <div><span>Lesson</span><strong>{lessonTitle}</strong></div>
              <div><span>Total questions</span><strong>{quiz.questions.length}</strong></div>
              <div><span>Total marks</span><strong>{totalMarks}</strong></div>
            </div>
          </section>
          <QuizSettings values={quiz} validationErrors={validationErrors} onValidationChange={(field) => setValidationErrors((current) => ({ ...current, [field]: '' }))} onChange={(field, value) => setQuiz((current) => ({ ...current, [field]: value }))} />
        </aside>
      </div>

      <footer className="instructor-quiz-sticky-actions">
        <button type="button" className="instructor-quiz-button is-secondary" onClick={() => navigate(`/instructor/courses/${courseId}/assessments`)}>Cancel</button>
        <button type="button" className="instructor-quiz-button is-secondary" onClick={saveDraft} disabled={isSaving || isSubmitting || Boolean(savingQuestionId)}><Save size={16} /> {isSaving ? 'Saving...' : 'Save Draft'}</button>
        <button type="button" className="instructor-quiz-button is-primary" onClick={submitReview} disabled={isSaving || isSubmitting || Boolean(savingQuestionId) || quiz.reviewStatus === 'pending'}><Send size={16} /> {isSubmitting ? 'Submitting...' : quiz.reviewStatus === 'pending' ? 'Pending Review' : 'Submit for Review'}</button>
      </footer>
    </main>
  )
}

export default QuizBuilder
