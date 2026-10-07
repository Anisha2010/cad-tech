import multer from 'multer'
import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import { AppError } from '../utils/AppError.js'
import { uploadCourseMediaFile, validateCourseMediaUpload } from '../config/storage.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.COURSE_MEDIA_UPLOAD_MAX_BYTES || 104857600),
    files: 1
  }
})

const receiveCourseFile = (req, res, next) => upload.single('file')(req, res, (error) => {
  if (error?.code === 'LIMIT_FILE_SIZE') return sendError(res, 'Course media file exceeds the upload size limit.', 413)
  if (error) return next(new AppError('Unable to receive course media file.', 400))
  next()
})

export const uploadCourseMedia = [
  receiveCourseFile,
  asyncHandler(async (req, res) => {
    if (!req.file) return sendError(res, 'No course media file was provided.', 400)

    validateCourseMediaUpload({
      kind: req.params.kind,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size
    })

    const media = await uploadCourseMediaFile({
      kind: req.params.kind,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype
    })
    if (!media.url) throw new AppError('Cloudinary did not return a media URL.', 503)
    return sendSuccess(res, { media }, 'Course media uploaded successfully.')
  })
]

export default { uploadCourseMedia }