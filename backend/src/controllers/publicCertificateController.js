import asyncHandler from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'
import { verifyCertificate } from '../services/certificateService.js'

export const verifyPublicCertificate = asyncHandler(async (req, res) => {
  const result = await verifyCertificate(req.params.verificationCode)

  const response = {
    valid: result.valid,
    status: result.status,
    certificateNumber: result.certificateNumber,
    courseTitle: result.courseTitle,
    issuedAt: result.issuedAt ? new Date(result.issuedAt).toISOString() : null,
    ...(result.valid ? { studentName: result.studentName } : {})
  }

  return sendSuccess(res, response, 'Certificate verification completed.')
})

export default { verifyPublicCertificate }
