import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { Quiz, serializeQuiz } from '../models/Quiz.js'
import { Assignment, serializeAssignment } from '../models/Assignment.js'
import { Course } from '../models/Course.js'
import { User } from '../models/User.js'
import * as quizService from '../services/quizService.js'
import * as assignmentService from '../services/assignmentService.js'

const collectSummary = async (items) => {
  const courseIds = [...new Set(items.map((item) => String(item.courseId)))]
  const instructorIds = [...new Set(items.map((item) => String(item.createdBy)))]
  const [courses, instructors] = await Promise.all([
    Course.find({ _id: { $in: courseIds } }).lean(),
    User.find({ _id: { $in: instructorIds } }).lean()
  ])

  const courseMap = new Map(courses.map((course) => [String(course._id), { id: String(course._id), title: course.title }]))
  const instructorMap = new Map(instructors.map((user) => [String(user._id), { id: String(user._id), name: user.name, email: user.email }]))

  return items.map((item) => ({
    ...item,
    type: item.type || (item.questions ? 'quiz' : 'assignment'),
    course: courseMap.get(String(item.courseId)) || null,
    instructor: instructorMap.get(String(item.createdBy)) || null
  }))
}

const deserializeQuery = (req) => ({
  type: typeof req.query.type === 'string' ? req.query.type : 'all',
  reviewStatus: typeof req.query.reviewStatus === 'string' ? req.query.reviewStatus : 'all',
  publicationStatus: typeof req.query.publicationStatus === 'string' ? req.query.publicationStatus : 'all',
  courseId: typeof req.query.courseId === 'string' ? req.query.courseId : '',
  search: typeof req.query.search === 'string' ? req.query.search : ''
})

export const listAssessments = asyncHandler(async (req, res) => {
  const filters = deserializeQuery(req)
  const [quizRecords, assignmentRecords] = await Promise.all([
    Quiz.find({}).sort({ updatedAt: -1 }).lean(),
    Assignment.find({}).sort({ updatedAt: -1 }).lean()
  ])

  const combined = [
    ...quizRecords.map((item) => ({ ...serializeQuiz(item), type: 'quiz' })),
    ...assignmentRecords.map((item) => ({ ...serializeAssignment(item), type: 'assignment' }))
  ]

  const filtered = combined.filter((item) => {
    if (filters.type !== 'all' && item.type !== filters.type) return false
    if (filters.reviewStatus !== 'all' && item.reviewStatus !== filters.reviewStatus) return false
    if (filters.publicationStatus !== 'all' && item.publicationStatus !== filters.publicationStatus) return false
    if (filters.courseId && String(item.courseId) !== String(filters.courseId)) return false
    if (filters.search) {
      const needle = filters.search.toLowerCase()
      return (item.title || '').toLowerCase().includes(needle) || (item.description || '').toLowerCase().includes(needle)
    }
    return true
  })

  const items = await collectSummary(filtered)
  return sendSuccess(res, { assessments: items }, 'Assessments retrieved successfully.')
})

export const getQuizReview = asyncHandler(async (req, res) => {
  const assessment = await quizService.getQuizForAdminReview({ quizId: req.params.quizId })
  const course = await Course.findById(assessment.courseId).lean()
  const instructor = assessment.createdBy ? await User.findById(assessment.createdBy).lean() : null
  return sendSuccess(res, { assessment, course: course ? { id: String(course._id), title: course.title, status: course.status, instructorId: course.instructorId ? String(course.instructorId) : null } : null, instructor: instructor ? { id: String(instructor._id), name: instructor.name, email: instructor.email } : null }, 'Quiz review details retrieved successfully.')
})

export const getAssignmentReview = asyncHandler(async (req, res) => {
  const assessment = await assignmentService.getAssignmentForAdminReview({ assignmentId: req.params.assignmentId })
  const course = await Course.findById(assessment.courseId).lean()
  const instructor = assessment.createdBy ? await User.findById(assessment.createdBy).lean() : null
  return sendSuccess(res, { assessment, course: course ? { id: String(course._id), title: course.title, status: course.status, instructorId: course.instructorId ? String(course.instructorId) : null } : null, instructor: instructor ? { id: String(instructor._id), name: instructor.name, email: instructor.email } : null }, 'Assignment review details retrieved successfully.')
})

export const approveQuizReview = asyncHandler(async (req, res) => {
  const assessment = await quizService.approveQuiz({ quizId: req.params.quizId, adminId: req.user.id })
  return sendSuccess(res, { assessment }, 'Quiz review approved.')
})

export const requestQuizChanges = asyncHandler(async (req, res) => {
  const assessment = await quizService.requestQuizChanges({ quizId: req.params.quizId, adminId: req.user.id, feedback: req.body?.feedback })
  return sendSuccess(res, { assessment }, 'Changes requested from the instructor.')
})

export const publishQuiz = asyncHandler(async (req, res) => {
  const assessment = await quizService.publishQuiz({ quizId: req.params.quizId, adminId: req.user.id })
  return sendSuccess(res, { assessment }, 'Quiz published successfully.')
})

export const unpublishQuiz = asyncHandler(async (req, res) => {
  const assessment = await quizService.unpublishQuiz({ quizId: req.params.quizId, adminId: req.user.id })
  return sendSuccess(res, { assessment }, 'Quiz unpublished successfully.')
})

export const archiveQuizAdmin = asyncHandler(async (req, res) => {
  const assessment = await quizService.archiveQuizAsAdmin({ quizId: req.params.quizId, adminId: req.user.id })
  return sendSuccess(res, { assessment }, 'Quiz archived successfully.')
})

export const approveAssignmentReview = asyncHandler(async (req, res) => {
  const assessment = await assignmentService.approveAssignment({ assignmentId: req.params.assignmentId, adminId: req.user.id })
  return sendSuccess(res, { assessment }, 'Assignment review approved.')
})

export const requestAssignmentChanges = asyncHandler(async (req, res) => {
  const assessment = await assignmentService.requestAssignmentChanges({ assignmentId: req.params.assignmentId, adminId: req.user.id, feedback: req.body?.feedback })
  return sendSuccess(res, { assessment }, 'Changes requested from the instructor.')
})

export const publishAssignment = asyncHandler(async (req, res) => {
  const assessment = await assignmentService.publishAssignment({ assignmentId: req.params.assignmentId, adminId: req.user.id })
  return sendSuccess(res, { assessment }, 'Assignment published successfully.')
})

export const unpublishAssignment = asyncHandler(async (req, res) => {
  const assessment = await assignmentService.unpublishAssignment({ assignmentId: req.params.assignmentId, adminId: req.user.id })
  return sendSuccess(res, { assessment }, 'Assignment unpublished successfully.')
})

export const archiveAssignmentAdmin = asyncHandler(async (req, res) => {
  const assessment = await assignmentService.archiveAssignmentAsAdmin({ assignmentId: req.params.assignmentId, adminId: req.user.id })
  return sendSuccess(res, { assessment }, 'Assignment archived successfully.')
})

export default {
  listAssessments,
  getQuizReview,
  getAssignmentReview,
  approveQuizReview,
  requestQuizChanges,
  publishQuiz,
  unpublishQuiz,
  archiveQuizAdmin,
  approveAssignmentReview,
  requestAssignmentChanges,
  publishAssignment,
  unpublishAssignment,
  archiveAssignmentAdmin
}
