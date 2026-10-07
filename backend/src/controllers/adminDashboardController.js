import asyncHandler from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'
import { getAdminDashboard, listAdminEnrollments as getAdminEnrollments, listAdminPayments as getAdminPayments } from '../services/adminDashboardService.js'

export const getDashboard = asyncHandler(async (req, res) => {
  sendSuccess(res, await getAdminDashboard(), 'Admin dashboard retrieved successfully.')
})

const getListOptions = (query) => ({
  status: typeof query.status === 'string' ? query.status : 'all',
  page: Number(query.page || 1),
  limit: Number(query.limit || 20)
})

export const listAdminEnrollments = asyncHandler(async (req, res) => {
  sendSuccess(res, await getAdminEnrollments(getListOptions(req.query)), 'Enrollments retrieved successfully.')
})

export const listAdminPayments = asyncHandler(async (req, res) => {
  sendSuccess(res, await getAdminPayments(getListOptions(req.query)), 'Payments retrieved successfully.')
})

export default { getDashboard, listAdminEnrollments, listAdminPayments }