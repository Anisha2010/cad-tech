import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { AppError } from '../utils/AppError.js'
import {
  listStudentCadDownloads,
  getCadProductAccessDetails,
  requestCadDownload,
  grantCadProductAccess,
  revokeCadProductAccess,
  restoreCadProductAccess,
  claimFreeCadProductAccess,
  reconcilePaidCadOrderEntitlements
} from '../services/cadDownloadEntitlementService.js'
import { CadDownloadEntitlement, serializeCadDownloadEntitlement } from '../models/CadDownloadEntitlement.js'

export const listMyCadDownloads = asyncHandler(async (req, res) => {
  const entitlements = await listStudentCadDownloads({ userId: req.user.id })
  return sendSuccess(res, { entitlements }, 'Your CAD downloads were retrieved successfully.')
})

export const checkCadProductAccess = asyncHandler(async (req, res) => {
  const result = await getCadProductAccessDetails({ userId: req.user.id, productId: req.params.productId })
  return sendSuccess(res, result, 'CAD access status retrieved successfully.')
})

export const requestCadDownloadByProduct = asyncHandler(async (req, res) => {
  try {
    const result = await requestCadDownload({ userId: req.user.id, productId: req.params.productId })
    return sendSuccess(res, result, 'Secure CAD download link generated successfully.')
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 503) {
      return sendError(res, 'Secure CAD downloads are temporarily unavailable.', 503)
    }
    throw error
  }
})

export const claimCadProductAccess = asyncHandler(async (req, res) => {
  const result = await claimFreeCadProductAccess({ userId: req.user.id, productId: req.params.productId })
  return sendSuccess(res, { entitlement: result }, 'CAD product access claimed successfully.', 201)
})

export const grantCadProductEntitlement = asyncHandler(async (req, res) => {
  const result = await grantCadProductAccess({
    userId: req.body?.userId,
    productId: req.params.productId,
    source: req.body?.source || 'admin_grant',
    grantedBy: req.user.id,
    reason: req.body?.reason || null
  })

  return sendSuccess(res, { entitlement: result }, 'CAD access granted successfully.', 201)
})

export const revokeCadProductEntitlement = asyncHandler(async (req, res) => {
  const result = await revokeCadProductAccess({
    entitlementId: req.params.entitlementId,
    revokedBy: req.user.id,
    reason: req.body?.reason || 'Administrative revocation'
  })

  return sendSuccess(res, { entitlement: result }, 'CAD access revoked successfully.')
})

export const restoreCadProductEntitlement = asyncHandler(async (req, res) => {
  const result = await restoreCadProductAccess({ entitlementId: req.params.entitlementId, restoredBy: req.user.id })
  return sendSuccess(res, { entitlement: result }, 'CAD access restored successfully.')
})

export const listCadEntitlementsAdmin = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.limit || 20)
  const status = typeof req.query.status === 'string' ? req.query.status : 'all'
  const search = typeof req.query.search === 'string' ? req.query.search : ''

  const filter = {}
  if (status && status !== 'all') filter.status = status

  const query = { ...filter }
  if (search) {
    const regExp = new RegExp(String(search).trim(), 'i')
    query.$or = [
      { userId: regExp },
      { productId: regExp },
      { source: regExp }
    ]
  }

  const totalItems = await CadDownloadEntitlement.countDocuments(query)
  const items = await CadDownloadEntitlement.find(query).sort({ grantedAt: -1 }).skip((page - 1) * limit).limit(limit).lean()

  return sendSuccess(res, {
    entitlements: items.map(serializeCadDownloadEntitlement),
    pagination: { page, limit, totalItems, totalPages: totalItems ? Math.ceil(totalItems / limit) : 0 }
  }, 'CAD entitlements retrieved successfully.')
})

export const reconcileCadEntitlementsAdmin = asyncHandler(async (req, res) => {
  const result = await reconcilePaidCadOrderEntitlements()
  return sendSuccess(res, result, 'CAD entitlement reconciliation completed.')
})

export default {
  listMyCadDownloads,
  checkCadProductAccess,
  requestCadDownloadByProduct,
  claimCadProductAccess,
  grantCadProductEntitlement,
  revokeCadProductEntitlement,
  restoreCadProductEntitlement,
  listCadEntitlementsAdmin,
  reconcileCadEntitlementsAdmin
}
