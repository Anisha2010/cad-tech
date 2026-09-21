import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import * as courseService from '../services/courseService.js'
import { approveCourseReview, assignInstructorToCourse, getAssignableInstructors, requestCourseChanges } from '../services/instructorService.js'

export const listAdminCourses = asyncHandler(async (req, res) => {
  const filters = {
    search: typeof req.query.search === 'string' ? req.query.search : '',
    status: typeof req.query.status === 'string' ? req.query.status : 'all',
    software: typeof req.query.software === 'string' ? req.query.software : '',
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 12)
  }

  const result = await courseService.getAdminCourseList(filters)
  return sendSuccess(res, {
    courses: result.courses,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalItems: result.totalItems,
      totalPages: result.totalPages
    }
  }, 'Courses retrieved successfully.')
})

export const createAdminCourse = asyncHandler(async (req, res) => {
  const course = await courseService.createAdminCourse({ userId: req.user.id, payload: req.body })
  return sendSuccess(res, { course }, 'Course created successfully.', 201)
})

export const getAdminCourse = asyncHandler(async (req, res) => {
  const course = await courseService.getCourseAdminDetail(req.params.courseId)
  if (!course) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { course }, 'Course retrieved successfully.')
})

export const updateAdminCourse = asyncHandler(async (req, res) => {
  const course = await courseService.updateAdminCourse({ courseId: req.params.courseId, userId: req.user.id, payload: req.body })
  if (!course) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { course }, 'Course updated successfully.')
})

export const updateAdminCourseStatus = asyncHandler(async (req, res) => {
  const course = await courseService.updateAdminCourseStatus({ courseId: req.params.courseId, userId: req.user.id, status: req.body?.status })
  if (!course) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { course }, course.status === 'published' ? 'Course published successfully.' : 'Course archived successfully.')
})

export const deleteAdminCourse = asyncHandler(async (req, res) => {
  const result = await courseService.deleteAdminCourse({ courseId: req.params.courseId, userId: req.user.id })
  if (!result) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { archived: true }, 'Course was archived and preserved for enrollment history.')
})

export const listAdminInstructors = asyncHandler(async (req, res) => {
  const instructors = await getAssignableInstructors()
  return sendSuccess(res, { instructors }, 'Instructor options retrieved successfully.')
})

export const assignAdminCourseInstructor = asyncHandler(async (req, res) => {
  const course = await assignInstructorToCourse({ courseId: req.params.courseId, instructorId: req.body?.instructorId ?? null, actorId: req.user.id })
  if (!course) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { course }, 'Instructor assignment updated successfully.')
})

export const approveReview = asyncHandler(async (req, res) => {
  const course = await approveCourseReview({ courseId: req.params.courseId, adminId: req.user.id })
  if (!course) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { course }, 'Course review approved.')
})

export const requestReviewChanges = asyncHandler(async (req, res) => {
  const course = await requestCourseChanges({ courseId: req.params.courseId, adminId: req.user.id, feedback: req.body?.feedback })
  if (!course) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { course }, 'Changes requested from the assigned instructor.')
})

export default {
  listAdminCourses,
  createAdminCourse,
  getAdminCourse,
  updateAdminCourse,
  updateAdminCourseStatus,
  deleteAdminCourse,
  assignAdminCourseInstructor,
  approveReview,
  requestReviewChanges
}
