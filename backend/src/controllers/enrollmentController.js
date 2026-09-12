import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { getStudentEnrollments } from '../services/enrollmentService.js'

const parseQuery = (query) => {
  const status = query.status || 'all'
  const page = Number(query.page || 1)
  const limit = Number(query.limit || 12)
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 80) : ''
  if (!['all', 'active', 'completed'].includes(status)) throw new Error('Invalid enrollment status.')
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('Invalid pagination values.')
  return { status, page, limit, search }
}

export const listEnrollments = asyncHandler(async (req, res) => {
  try {
    const filters = parseQuery(req.query)
    const result = await getStudentEnrollments({ userId: req.user.id, ...filters })
    return sendSuccess(res, { enrollments: result.enrollments, pagination: { page: filters.page, limit: filters.limit, totalItems: result.totalItems, totalPages: result.totalItems ? Math.ceil(result.totalItems / filters.limit) : 0 } }, 'Enrollments retrieved successfully.')
  } catch (error) {
    if (error.message.startsWith('Invalid')) return sendError(res, error.message, 400)
    throw error
  }
})