import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { listCertificatesForAdmin, findCertificateById } from '../repositories/certificateRepository.js'
import { reissueCertificate } from '../services/certificateService.js'
import { Certificate } from '../models/Certificate.js'

export const listAdminCertificates = asyncHandler(async (req, res) => {
  const result = await listCertificatesForAdmin({
    search: typeof req.query.search === 'string' ? req.query.search : '',
    courseId: typeof req.query.courseId === 'string' ? req.query.courseId : '',
    status: typeof req.query.status === 'string' ? req.query.status : 'all',
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20)
  })

  return sendSuccess(res, { certificates: result.certificates, pagination: { page: result.page, limit: result.limit, totalItems: result.totalItems, totalPages: result.totalPages } }, 'Certificates retrieved successfully.')
})

export const getAdminCertificate = asyncHandler(async (req, res) => {
  const certificate = await findCertificateById(req.params.certificateId)
  if (!certificate) return sendError(res, 'Certificate not found.', 404)
  return sendSuccess(res, { certificate }, 'Certificate retrieved successfully.')
})

export const revokeAdminCertificate = asyncHandler(async (req, res) => {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''
  if (!reason || reason.length < 5 || reason.length > 300) return sendError(res, 'A clear revocation reason is required.', 422)

  const certificate = await Certificate.findById(req.params.certificateId).lean()
  if (!certificate) return sendError(res, 'Certificate not found.', 404)

  const updated = await Certificate.findByIdAndUpdate(req.params.certificateId, {
    $set: {
      status: 'revoked',
      revokedAt: new Date(),
      revokedBy: req.user.id,
      revocationReason: reason,
      updatedAt: new Date()
    }
  }, { new: true, runValidators: true }).lean()

  return sendSuccess(res, { certificate: updated }, 'Certificate revoked successfully.')
})

export const reissueAdminCertificate = asyncHandler(async (req, res) => {
  const result = await reissueCertificate({ certificateId: req.params.certificateId, adminId: req.user.id })
  return sendSuccess(res, { certificate: result.certificate }, 'Certificate reissued successfully.')
})

export default {
  listAdminCertificates,
  getAdminCertificate,
  revokeAdminCertificate,
  reissueAdminCertificate
}
