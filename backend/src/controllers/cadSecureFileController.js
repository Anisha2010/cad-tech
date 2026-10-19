import multer from 'multer'
import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import * as cadProductService from '../services/cadProductService.js'
import { getCadSecureStorageMaxBytes } from '../config/storage.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: getCadSecureStorageMaxBytes(),
    files: 1
  }
})

export const uploadCadSecureProductFile = [
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const file = req.file
    if (!file) return sendError(res, 'No CAD file was provided.', 400)

    const result = await cadProductService.uploadCadSecureFile({
      userId: req.user.id,
      productId: req.params.productId,
      file
    })
    return sendSuccess(res, { product: result }, 'CAD secure file uploaded successfully.')
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
