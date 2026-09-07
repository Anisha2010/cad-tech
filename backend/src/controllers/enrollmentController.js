import asyncHandler from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'
import { getStudentEnrollments } from '../services/enrollmentService.js'

export const listEnrollments = asyncHandler(async (req, res) => sendSuccess(res, { enrollments: getStudentEnrollments(req.user.id) }, 'Enrollments retrieved successfully.'))