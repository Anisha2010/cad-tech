import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import * as courseService from '../services/courseService.js'

export const listPublicCourses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12 } = req.query
  const filters = {
    search: typeof req.query.search === 'string' ? req.query.search : '',
    software: typeof req.query.software === 'string' ? req.query.software : '',
    level: typeof req.query.level === 'string' ? req.query.level : '',
    category: typeof req.query.category === 'string' ? req.query.category : '',
    duration: typeof req.query.duration === 'string' ? req.query.duration : '',
    sort: typeof req.query.sort === 'string' ? req.query.sort : 'featured',
    page: Number(page),
    limit: Number(limit)
  }

  const result = await courseService.getPublicCourseList(filters)
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

export const getPublicCourseBySlug = asyncHandler(async (req, res) => {
  const course = await courseService.getCourseDetailBySlug(req.params.courseSlug)
  if (!course) return sendError(res, 'Course not found.', 404)
  return sendSuccess(res, { course }, 'Course retrieved successfully.')
})

export default {
  listPublicCourses,
  getPublicCourseBySlug
}
