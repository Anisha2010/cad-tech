import asyncHandler from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

export const getStudentDashboard = asyncHandler(async (req, res) => {
  const { id, name, role, avatarUrl } = req.user
  sendSuccess(res, {
    user: { id, name, role, avatarUrl }
  }, 'Student dashboard retrieved successfully.')
})

export default { getStudentDashboard }