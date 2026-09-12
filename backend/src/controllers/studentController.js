import asyncHandler from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'
import { getContinueLearningCourses, getRecentEnrollments, getStudentEnrollmentSummary } from '../services/enrollmentService.js'

export const getStudentDashboard = asyncHandler(async (req, res) => {
  const { id, name, role, avatarUrl } = req.user
  const [summary, continueLearning, recentEnrollments] = await Promise.all([
    getStudentEnrollmentSummary(id),
    getContinueLearningCourses(id),
    getRecentEnrollments(id)
  ])
  sendSuccess(res, { user: { id, name, role, avatarUrl }, summary, continueLearning, recentEnrollments }, 'Student dashboard retrieved successfully.')
})

export default { getStudentDashboard }