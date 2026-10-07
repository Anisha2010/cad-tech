import multer from 'multer'
import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { AppError } from '../utils/AppError.js'
import { uploadProfileImageFile, validateCadPreviewImageUpload } from '../config/storage.js'

const maxBytes = Number(process.env.CAD_PREVIEW_IMAGE_UPLOAD_MAX_BYTES || 10485760)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1 } })

const receiveImage = (req, res, next) => upload.single('file')(req, res, (error) => {
  if (error?.code === 'LIMIT_FILE_SIZE') return sendError(res, `Profile image exceeds the ${maxBytes} byte upload limit.`, 413)
  if (error) return next(new AppError('Unable to receive profile image.', 400))
  next()
})

export const uploadProfileImage = [
  receiveImage,
  asyncHandler(async (req, res) => {
    if (!req.file) return sendError(res, 'No profile image was provided.', 400)
    validateCadPreviewImageUpload({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size
    })
    const image = await uploadProfileImageFile({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype
    })
    if (!image.url) throw new AppError('Cloudinary did not return an image URL.', 503)
    return sendSuccess(res, { image }, 'Profile image uploaded successfully.')
  })
]

export default { uploadProfileImage }