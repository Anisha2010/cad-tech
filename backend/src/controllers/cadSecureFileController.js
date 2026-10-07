import multer from 'multer'
import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { AppError } from '../utils/AppError.js'
import * as cadProductService from '../services/cadProductService.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.CAD_FILE_UPLOAD_MAX_BYTES || 52428800),
    files: 1
  }
})

export const uploadCadSecureProductFile = [
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const file = req.file
    if (!file) return sendError(res, 'No CAD file was provided.', 400)

    try {
      const result = await cadProductService.uploadCadSecureFile({
        userId: req.user.id,
        productId: req.params.productId,
        file
      })
      return sendSuccess(res, { product: result }, 'CAD secure file uploaded successfully.')
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 503) {
        return sendError(res, 'Secure CAD file storage is temporarily unavailable.', 503)
      }
      throw error
    }
  })
]

export const deleteCadSecureProductFile = asyncHandler(async (req, res) => {
  const result = await cadProductService.deleteCadSecureFile({
    userId: req.user.id,
    productId: req.params.productId
  })

  if (!result) return sendError(res, 'CAD product not found.', 404)
  return sendSuccess(res, { product: result }, 'CAD secure file removed successfully.')
})

export default {
  uploadCadSecureProductFile,
  deleteCadSecureProductFile
}
