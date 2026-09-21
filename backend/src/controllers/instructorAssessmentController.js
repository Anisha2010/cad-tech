import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import * as quizService from '../services/quizService.js'
import * as assignmentService from '../services/assignmentService.js'

const normalizeFilters = (req) => ({
  type: typeof req.query.type === 'string' ? req.query.type : 'all',
  reviewStatus: typeof req.query.reviewStatus === 'string' ? req.query.reviewStatus : 'all',
  publicationStatus: typeof req.query.publicationStatus === 'string' ? req.query.publicationStatus : 'all',
  search: typeof req.query.search === 'string' ? req.query.search : ''
})

export const listCourseAssessments = asyncHandler(async (req, res) => {
  const filters = normalizeFilters(req)
  const [quizzes, assignments] = await Promise.all([
    quizService.listCourseQuizzes({ courseId: req.params.courseId, instructorId: req.user.id, filters }),
    assignmentService.listCourseAssignments({ courseId: req.params.courseId, instructorId: req.user.id, filters })
  ])

  const assessments = [...quizzes.map((item) => ({ ...item, type: 'quiz' })), ...assignments.map((item) => ({ ...item, type: 'assignment' }))]
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0))
    .filter((item) => {
      if (filters.type !== 'all' && item.type !== filters.type) return false
      if (filters.reviewStatus !== 'all' && item.reviewStatus !== filters.reviewStatus) return false
      if (filters.publicationStatus !== 'all' && item.publicationStatus !== filters.publicationStatus) return false
      if (filters.search) {
        const term = filters.search.toLowerCase()
        return (item.title || '').toLowerCase().includes(term) || (item.description || '').toLowerCase().includes(term) || (item.instructions || '').toLowerCase().includes(term)
      }
      return true
    })

  sendSuccess(res, {
    assessments,
    summary: {
      total: assessments.length,
      quizzes: assessments.filter((item) => item.type === 'quiz').length,
      assignments: assessments.filter((item) => item.type === 'assignment').length,
      draft: assessments.filter((item) => item.publicationStatus === 'draft').length,
      pendingReview: assessments.filter((item) => item.reviewStatus === 'pending').length,
      published: assessments.filter((item) => item.publicationStatus === 'published').length
    }
  }, 'Assessments retrieved successfully.')
})

export const createQuiz = asyncHandler(async (req, res) => {
  const assessment = await quizService.createQuiz({ courseId: req.params.courseId, instructorId: req.user.id, payload: req.body || {} })
  return sendSuccess(res, { assessment }, 'Quiz created successfully.', 201)
})

export const getQuiz = asyncHandler(async (req, res) => {
  const assessment = await quizService.getQuizByIdForInstructor({ courseId: req.params.courseId, instructorId: req.user.id, quizId: req.params.quizId })
  return sendSuccess(res, { assessment }, 'Quiz retrieved successfully.')
})

export const updateQuiz = asyncHandler(async (req, res) => {
  const assessment = await quizService.updateQuiz({ courseId: req.params.courseId, instructorId: req.user.id, quizId: req.params.quizId, payload: req.body || {} })
  return sendSuccess(res, { assessment }, 'Quiz updated successfully.')
})

export const addQuizQuestion = asyncHandler(async (req, res) => {
  const assessment = await quizService.createQuestion({ courseId: req.params.courseId, instructorId: req.user.id, quizId: req.params.quizId, payload: req.body || {} })
  return sendSuccess(res, { assessment }, 'Question added successfully.', 201)
})

export const updateQuizQuestion = asyncHandler(async (req, res) => {
  const assessment = await quizService.updateQuestion({ courseId: req.params.courseId, instructorId: req.user.id, quizId: req.params.quizId, questionId: req.params.questionId, payload: req.body || {} })
  return sendSuccess(res, { assessment }, 'Question updated successfully.')
})

export const reorderQuizQuestions = asyncHandler(async (req, res) => {
  const assessment = await quizService.reorderQuestions({ courseId: req.params.courseId, instructorId: req.user.id, quizId: req.params.quizId, orderedQuestionIds: req.body?.orderedQuestionIds || [] })
  return sendSuccess(res, { assessment }, 'Questions reordered successfully.')
})

export const archiveQuizQuestion = asyncHandler(async (req, res) => {
  const assessment = await quizService.archiveQuestion({ courseId: req.params.courseId, instructorId: req.user.id, quizId: req.params.quizId, questionId: req.params.questionId })
  return sendSuccess(res, { assessment }, 'Question archived successfully.')
})

export const submitQuizForReview = asyncHandler(async (req, res) => {
  const assessment = await quizService.submitQuizForReview({ courseId: req.params.courseId, instructorId: req.user.id, quizId: req.params.quizId })
  return sendSuccess(res, { assessment }, 'Quiz submitted for review.')
})

export const archiveQuiz = asyncHandler(async (req, res) => {
  const assessment = await quizService.archiveQuiz({ courseId: req.params.courseId, instructorId: req.user.id, quizId: req.params.quizId })
  return sendSuccess(res, { assessment }, 'Quiz archived successfully.')
})

export const createAssignment = asyncHandler(async (req, res) => {
  const assessment = await assignmentService.createAssignment({ courseId: req.params.courseId, instructorId: req.user.id, payload: req.body || {} })
  return sendSuccess(res, { assessment }, 'Assignment created successfully.', 201)
})

export const getAssignment = asyncHandler(async (req, res) => {
  const assessment = await assignmentService.getAssignmentByIdForInstructor({ courseId: req.params.courseId, instructorId: req.user.id, assignmentId: req.params.assignmentId })
  return sendSuccess(res, { assessment }, 'Assignment retrieved successfully.')
})

export const updateAssignment = asyncHandler(async (req, res) => {
  const assessment = await assignmentService.updateAssignment({ courseId: req.params.courseId, instructorId: req.user.id, assignmentId: req.params.assignmentId, payload: req.body || {} })
  return sendSuccess(res, { assessment }, 'Assignment updated successfully.')
})

export const submitAssignmentForReview = asyncHandler(async (req, res) => {
  const assessment = await assignmentService.submitAssignmentForReview({ courseId: req.params.courseId, instructorId: req.user.id, assignmentId: req.params.assignmentId })
  return sendSuccess(res, { assessment }, 'Assignment submitted for review.')
})

export const archiveAssignment = asyncHandler(async (req, res) => {
  const assessment = await assignmentService.archiveAssignment({ courseId: req.params.courseId, instructorId: req.user.id, assignmentId: req.params.assignmentId })
  return sendSuccess(res, { assessment }, 'Assignment archived successfully.')
})

export default {
  listCourseAssessments,
  createQuiz,
  getQuiz,
  updateQuiz,
  addQuizQuestion,
  updateQuizQuestion,
  reorderQuizQuestions,
  archiveQuizQuestion,
  submitQuizForReview,
  archiveQuiz,
  createAssignment,
  getAssignment,
  updateAssignment,
  submitAssignmentForReview,
  archiveAssignment
}
