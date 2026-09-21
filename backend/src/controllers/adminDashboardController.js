import asyncHandler from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'
import { getAdminDashboard } from '../services/adminDashboardService.js'

export const getDashboard = asyncHandler(async (req, res) => {
  sendSuccess(res, await getAdminDashboard(), 'Admin dashboard retrieved successfully.')
})

export default { getDashboard }