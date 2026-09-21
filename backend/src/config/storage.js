import { v2 as cloudinary } from 'cloudinary'

const storageConfig = {
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  maxBytes: Number(process.env.ASSIGNMENT_UPLOAD_MAX_BYTES || 10485760),
  maxAttachments: 5
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

export const getAssignmentUploadMaxBytes = () => Number.isFinite(storageConfig.maxBytes) && storageConfig.maxBytes > 0 ? storageConfig.maxBytes : 10485760

export const isAssignmentStorageConfigured = () => Boolean(
  storageConfig.cloudinaryCloudName &&
  storageConfig.cloudinaryApiKey &&
  storageConfig.cloudinaryApiSecret
)

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

export default {
  assignmentAllowedMimeTypes,
  getAssignmentUploadMaxBytes,
  isAssignmentStorageConfigured,
  configureCloudinary,
  fileUploadStatus,
  uploadAssignmentFile,
  deleteAssignmentFile,
  sanitizeOriginalFilename
}
