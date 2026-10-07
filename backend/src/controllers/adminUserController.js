import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import * as adminUserService from '../services/adminUserService.js'

export const listAdminUsers = asyncHandler(async (req, res) => {
  const result = await adminUserService.listAdminUsers({
    role: req.params.role,
    status: typeof req.query.status === 'string' ? req.query.status : 'all',
    verified: typeof req.query.verified === 'string' ? req.query.verified : 'all',
    search: typeof req.query.search === 'string' ? req.query.search : '',
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20)
  })
  return sendSuccess(res, result, 'Users retrieved successfully.')
})

export const getAdminUser = asyncHandler(async (req, res) => {
  const result = await adminUserService.getAdminUser({ userId: req.params.userId, role: req.params.role })
  if (!result) return sendError(res, 'User not found.', 404)
  return sendSuccess(res, result, 'User retrieved successfully.')
})

export const updateAdminUserStatus = asyncHandler(async (req, res) => {
  const user = await adminUserService.setAdminUserStatus({
    actorId: req.user.id,
    userId: req.params.userId,
    role: req.params.role,
    status: req.body?.status
  })
  if (!user) return sendError(res, 'User not found.', 404)
  return sendSuccess(res, { user }, 'User account status updated successfully.')
})

export const deleteAdminUser = asyncHandler(async (req, res) => {
  const user = await adminUserService.softDeleteAdminUser({
    actorId: req.user.id,
    userId: req.params.userId,
    role: req.params.role
  })
  if (!user) return sendError(res, 'User not found.', 404)
  return sendSuccess(res, { user }, 'User account removed successfully.')
})

export default { listAdminUsers, getAdminUser, updateAdminUserStatus, deleteAdminUser }
