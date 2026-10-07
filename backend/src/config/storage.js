import path from 'node:path'
import { v2 as cloudinary } from 'cloudinary'
import { AppError } from '../utils/AppError.js'

const CAD_SECURE_ALLOWED_EXTENSIONS = new Set([
  '.dwg', '.dxf', '.step', '.stp', '.iges', '.igs', '.stl', '.obj', '.fbx', '.sldprt', '.sldasm', '.pdf', '.zip'
])

const CAD_SECURE_ALLOWED_MIME_TYPES = new Set([
  'application/octet-stream',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-dwg',
  'image/x-dwg',
  'application/dxf',
  'image/vnd.dwg',
  'application/step',
  'application/octet-stream',
  'model/stl',
  'application/sla',
  'application/x-tgif',
  'text/plain',
  'application/xml',
  'application/json'
])

const COURSE_MEDIA_TYPES = {
  thumbnail: {
    extensions: new Set(['.jpg', '.jpeg', '.png', '.webp']),
    mimeTypes: new Set(['image/jpeg', 'image/png', 'image/webp']),
    maxBytes: 10485760
  },
  video: {
    extensions: new Set(['.mp4', '.mov', '.webm', '.m4v']),
    mimeTypes: new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']),
    maxBytes: Number(process.env.COURSE_MEDIA_UPLOAD_MAX_BYTES || 104857600)
  },
  pdf: {
    extensions: new Set(['.pdf']),
    mimeTypes: new Set(['application/pdf']),
    maxBytes: Number(process.env.COURSE_MEDIA_UPLOAD_MAX_BYTES || 104857600)
  },
  resource: {
    extensions: new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.zip', '.txt', '.csv', '.jpg', '.jpeg', '.png', '.webp']),
    mimeTypes: new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/x-zip-compressed', 'text/plain', 'text/csv', 'image/jpeg', 'image/png', 'image/webp']),
    maxBytes: Number(process.env.COURSE_MEDIA_UPLOAD_MAX_BYTES || 104857600)
  }
}

const CAD_PREVIEW_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const CAD_PREVIEW_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const FOUNDER_IMAGE_EXTENSIONS = CAD_PREVIEW_IMAGE_EXTENSIONS
const FOUNDER_IMAGE_MIME_TYPES = CAD_PREVIEW_IMAGE_MIME_TYPES

const storageConfig = {
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  maxBytes: Number(process.env.ASSIGNMENT_UPLOAD_MAX_BYTES || 10485760),
  maxAttachments: 5,
  cadMaxBytes: Number(process.env.CAD_FILE_UPLOAD_MAX_BYTES || 52428800),
  cadMaxFiles: 1,
  courseMediaMaxBytes: Number(process.env.COURSE_MEDIA_UPLOAD_MAX_BYTES || 104857600),
  cadPreviewImageMaxBytes: Number(process.env.CAD_PREVIEW_IMAGE_UPLOAD_MAX_BYTES || 10485760)
}

export const assignmentAllowedMimeTypes = {
  pdf: ['application/pdf'],
  document: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  image: ['image/jpeg', 'image/png', 'image/webp'],
  text: ['text/plain', 'application/plain']
}

export const sanitizeOriginalFilename = (value) => {
  const base = typeof value === 'string' ? value : ''
  const cleaned = base.replace(/[\\/]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return 'assignment-file'
  return cleaned.replace(/[^a-zA-Z0-9._-]+/g, '-')
}

export const validateCadSecureFileUpload = ({ originalName, mimeType, sizeBytes }) => {
  const fileName = typeof originalName === 'string' ? originalName : ''
  const extension = path.extname(fileName).toLowerCase()
  const safeMimeType = typeof mimeType === 'string' ? mimeType.toLowerCase().trim() : ''
  const size = Number(sizeBytes) || 0

  if (!fileName || !extension || !CAD_SECURE_ALLOWED_EXTENSIONS.has(extension)) {
    throw new AppError('Unsupported CAD file type.', 400)
  }

  if (size <= 0) {
    throw new AppError('CAD file cannot be empty.', 400)
  }

  const mimeValid = !safeMimeType || CAD_SECURE_ALLOWED_MIME_TYPES.has(safeMimeType) || safeMimeType.startsWith('application/') || safeMimeType.startsWith('image/') || safeMimeType.startsWith('model/') || safeMimeType === 'application/octet-stream'
  if (!mimeValid) {
    throw new AppError('Unsupported CAD file type.', 400)
  }

  const maxBytes = getCadSecureStorageMaxBytes()
  if (size > maxBytes) {
    throw new AppError(`CAD file exceeds the ${maxBytes} byte upload limit.`, 413)
  }

  return {
    extension: extension.replace('.', '').toLowerCase(),
    mimeType: safeMimeType || 'application/octet-stream',
    sizeBytes: size
  }
}

export const validateCourseMediaUpload = ({ kind, originalName, mimeType, sizeBytes }) => {
  const rules = COURSE_MEDIA_TYPES[kind]
  if (!rules) throw new AppError('Unsupported course media type.', 400)
  const extension = path.extname(typeof originalName === 'string' ? originalName : '').toLowerCase()
  const safeMimeType = typeof mimeType === 'string' ? mimeType.toLowerCase().trim() : ''
  const size = Number(sizeBytes) || 0
  if (!rules.extensions.has(extension) || (safeMimeType && safeMimeType !== 'application/octet-stream' && !rules.mimeTypes.has(safeMimeType))) {
    throw new AppError(`Unsupported ${kind} file type.`, 400)
  }
  if (size <= 0) throw new AppError(`${kind} file cannot be empty.`, 400)
  if (size > rules.maxBytes) throw new AppError(`${kind} file exceeds the ${rules.maxBytes} byte upload limit.`, 413)
  return { extension: extension.slice(1), mimeType: safeMimeType || 'application/octet-stream', sizeBytes: size }
}

export const validateCadPreviewImageUpload = ({ originalName, mimeType, sizeBytes }) => {
  const extension = path.extname(typeof originalName === 'string' ? originalName : '').toLowerCase()
  const safeMimeType = typeof mimeType === 'string' ? mimeType.toLowerCase().trim() : ''
  const size = Number(sizeBytes) || 0
  if (!CAD_PREVIEW_IMAGE_EXTENSIONS.has(extension) || (safeMimeType && safeMimeType !== 'application/octet-stream' && !CAD_PREVIEW_IMAGE_MIME_TYPES.has(safeMimeType))) {
    throw new AppError('Unsupported CAD preview image file type.', 400)
  }
  if (size <= 0) throw new AppError('CAD preview image file cannot be empty.', 400)
  if (size > storageConfig.cadPreviewImageMaxBytes) throw new AppError(`CAD preview image exceeds the ${storageConfig.cadPreviewImageMaxBytes} byte upload limit.`, 413)
  return { extension: extension.slice(1), mimeType: safeMimeType || 'application/octet-stream', sizeBytes: size }
}

export const validateFounderImageUpload = ({ originalName, mimeType, sizeBytes }) => {
  const extension = path.extname(typeof originalName === 'string' ? originalName : '').toLowerCase()
  const safeMimeType = typeof mimeType === 'string' ? mimeType.toLowerCase().trim() : ''
  const size = Number(sizeBytes) || 0
  if (!FOUNDER_IMAGE_EXTENSIONS.has(extension) || (safeMimeType && safeMimeType !== 'application/octet-stream' && !FOUNDER_IMAGE_MIME_TYPES.has(safeMimeType))) {
    throw new AppError('Unsupported founder image file type.', 400)
  }
  if (size <= 0) throw new AppError('Founder image file cannot be empty.', 400)
  if (size > Number(process.env.CAD_PREVIEW_IMAGE_UPLOAD_MAX_BYTES || 10485760)) throw new AppError(`Founder image exceeds the ${Number(process.env.CAD_PREVIEW_IMAGE_UPLOAD_MAX_BYTES || 10485760)} byte upload limit.`, 413)
  return { extension: extension.slice(1), mimeType: safeMimeType || 'application/octet-stream', sizeBytes: size }
}

export const getAssignmentUploadMaxBytes = () => Number.isFinite(storageConfig.maxBytes) && storageConfig.maxBytes > 0 ? storageConfig.maxBytes : 10485760
export const getCadSecureStorageMaxBytes = () => Number.isFinite(storageConfig.cadMaxBytes) && storageConfig.cadMaxBytes > 0 ? storageConfig.cadMaxBytes : 52428800

export const isAssignmentStorageConfigured = () => Boolean(
  storageConfig.cloudinaryCloudName &&
  storageConfig.cloudinaryApiKey &&
  storageConfig.cloudinaryApiSecret
)

export const isCadSecureStorageConfigured = () => Boolean(
  storageConfig.cloudinaryCloudName &&
  storageConfig.cloudinaryApiKey &&
  storageConfig.cloudinaryApiSecret
)

export const assertCadSecureStorageAvailable = () => {
  if (!isCadSecureStorageConfigured()) {
    throw new AppError('Secure CAD downloads are temporarily unavailable.', 503)
  }
  return true
}

export const configureCloudinary = () => {
  if (!isAssignmentStorageConfigured()) return false
  cloudinary.config({
    cloud_name: storageConfig.cloudinaryCloudName,
    api_key: storageConfig.cloudinaryApiKey,
    api_secret: storageConfig.cloudinaryApiSecret,
    secure: true
  })
  return true
}

export const fileUploadStatus = () => ({
  configured: isAssignmentStorageConfigured(),
  maxBytes: getAssignmentUploadMaxBytes(),
  maxAttachments: storageConfig.maxAttachments,
  message: 'File upload is temporarily unavailable.'
})

export const uploadAssignmentFile = async ({ buffer, originalName, mimeType }) => {
  if (!isAssignmentStorageConfigured()) {
    const error = new Error('File upload is temporarily unavailable.')
    error.code = 'STORAGE_UNAVAILABLE'
    throw error
  }

  const safeName = sanitizeOriginalFilename(originalName)
  const safeMimeType = typeof mimeType === 'string' ? mimeType.trim() : ''

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: 'auto',
      folder: 'cadtech/assignments',
      public_id: `${Date.now()}-${safeName}`,
      transformation: [{ fetch_format: 'auto' }]
    }, (error, result) => {
      if (error) {
        reject(new Error('File upload is temporarily unavailable.'))
        return
      }

      resolve({
        provider: 'cloudinary',
        publicId: result?.public_id || null,
        storageKey: result?.secure_url || result?.url || '',
        url: result?.secure_url || result?.url || '',
        mimeType: safeMimeType,
        originalName: safeName,
        secureUrl: result?.secure_url || result?.url || ''
      })
    })

    stream.end(buffer)
  })
}

export const deleteAssignmentFile = async ({ publicId }) => {
  if (!publicId || !isAssignmentStorageConfigured()) return true

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' })
    return true
  } catch {
    return false
  }
}

export const uploadCadSecureFile = async ({ buffer, originalName, mimeType }) => {
  if (!isCadSecureStorageConfigured()) {
    throw new AppError('Secure CAD uploads are temporarily unavailable.', 503)
  }

  const safeName = sanitizeOriginalFilename(originalName)
  const safeMimeType = typeof mimeType === 'string' ? mimeType.trim() : ''

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: 'auto',
      folder: 'cadtech/cad-files',
      public_id: `${Date.now()}-${safeName}`,
      type: 'private',
      access_mode: 'private',
      metadata: { originalName: safeName, mimeType: safeMimeType }
    }, (error, result) => {
      if (error) {
        reject(new AppError('Secure CAD uploads are temporarily unavailable.', 503))
        return
      }

      resolve({
        provider: 'cloudinary',
        publicId: result?.public_id || null,
        storageKey: result?.public_id || null,
        originalName: safeName,
        mimeType: safeMimeType || 'application/octet-stream',
        sizeInBytes: Number(buffer?.length || 0),
        signedUrlTtlSeconds: 3600
      })
    })

    stream.end(buffer)
  })
}

const uploadPublicCloudinaryFile = async ({ buffer, originalName, mimeType, folder, resourceType = 'auto' }) => {
  if (!isAssignmentStorageConfigured()) {
    throw new AppError('Cloudinary file storage is temporarily unavailable.', 503)
  }

  const safeName = sanitizeOriginalFilename(originalName)
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: resourceType,
      folder,
      public_id: `${Date.now()}-${safeName}`
    }, (error, result) => {
      if (error) {
        reject(new AppError('Cloudinary file upload failed.', 503))
        return
      }
      resolve({
        provider: 'cloudinary',
        publicId: result?.public_id || null,
        url: result?.secure_url || '',
        secureUrl: result?.secure_url || '',
        originalName: safeName,
        mimeType: mimeType || 'application/octet-stream',
        sizeInBytes: Number(buffer?.length || 0)
      })
    })
    stream.end(buffer)
  })
}

export const uploadCourseMediaFile = ({ buffer, originalName, mimeType, kind }) => uploadPublicCloudinaryFile({
  buffer,
  originalName,
  mimeType,
  folder: `cadtech/course-media/${kind}`
})

export const uploadCadPreviewImageFile = ({ buffer, originalName, mimeType }) => uploadPublicCloudinaryFile({
  buffer,
  originalName,
  mimeType,
  folder: 'cadtech/cad-previews',
  resourceType: 'image'
})

export const uploadProfileImageFile = ({ buffer, originalName, mimeType }) => uploadPublicCloudinaryFile({
  buffer,
  originalName,
  mimeType,
  folder: 'cadtech/profile-images',
  resourceType: 'image'
})

export const deleteCadSecureFile = async ({ publicId }) => {
  if (!publicId || !isCadSecureStorageConfigured()) return true

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto', type: 'private' })
    return true
  } catch {
    return false
  }
}

export const buildPrivateCadDownloadUrl = ({ publicId, resourceType = 'raw', originalName = '', expiresInSeconds = 3600 }) => {
  if (!publicId || !isCadSecureStorageConfigured()) {
    throw new AppError('Secure CAD downloads are temporarily unavailable.', 503)
  }

  const safeTtl = Number.isInteger(Number(expiresInSeconds)) && Number(expiresInSeconds) > 0 ? Number(expiresInSeconds) : 3600
  const timeStamp = Math.floor(Date.now() / 1000) + safeTtl
  const fileName = sanitizeOriginalFilename(originalName)

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: 'private',
    secure: true,
    sign_url: true,
    attachment: false,
    expires_at: timeStamp,
    transformation: [{ fetch_format: 'auto' }],
    filename: fileName
  })
}

export default {
  assignmentAllowedMimeTypes,
  getAssignmentUploadMaxBytes,
  getCadSecureStorageMaxBytes,
  isAssignmentStorageConfigured,
  isCadSecureStorageConfigured,
  assertCadSecureStorageAvailable,
  configureCloudinary,
  fileUploadStatus,
  uploadAssignmentFile,
  deleteAssignmentFile,
  uploadCadSecureFile,
  deleteCadSecureFile,
  buildPrivateCadDownloadUrl,
  sanitizeOriginalFilename
}
