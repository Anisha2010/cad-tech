import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CAD_SECURE_UPLOAD_ERROR_CODES,
  buildCadSecureUploadOptions,
  getCadSecureStorageConfigurationError,
  getCadSecureStorageMaxBytes,
  getCadSecureFileResourceType,
  getCadSecureUploadProviderDiagnostics,
  getCadSecureUploadProviderError,
  validateCadPreviewImageUpload,
  validateCadSecureFileUpload,
  validateCourseMediaUpload
} from '../src/config/storage.js'

test('CAD upload validation accepts an allowed non-empty secure file', () => {
  const result = validateCadSecureFileUpload({
    originalName: 'assembly.step',
    mimeType: 'application/step',
    sizeBytes: 1024
  })

  assert.deepEqual(result, {
    extension: 'step',
    mimeType: 'application/step',
    sizeBytes: 1024
  })
})

test('CAD secure-file validation accepts the existing supported PDF format', () => {
  const result = validateCadSecureFileUpload({
    originalName: 'manufacturing-drawing.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048
  })

  assert.equal(result.extension, 'pdf')
  assert.equal(validateCadSecureFileUpload({
    originalName: 'bracket.STL',
    mimeType: 'model/stl',
    sizeBytes: 2048
  }).extension, 'stl')
})

test('classifies missing secure storage configuration without exposing configuration values', () => {
  const error = getCadSecureStorageConfigurationError()

  assert.equal(error.code, CAD_SECURE_UPLOAD_ERROR_CODES.STORAGE_NOT_CONFIGURED)
  assert.equal(error.statusCode, 503)
  assert.equal(error.message, 'Secure CAD uploads are temporarily unavailable.')
})

test('classifies provider/network upload failures without exposing provider details', () => {
  const error = getCadSecureUploadProviderError({
    code: 'ECONNRESET',
    message: 'request to https://signed.example/secret?api_key=private failed'
  })

  assert.equal(error.code, CAD_SECURE_UPLOAD_ERROR_CODES.PROVIDER_UPLOAD_FAILED)
  assert.equal(error.statusCode, 503)
  assert.equal(error.message, 'Secure CAD upload failed.')
  assert.doesNotMatch(error.message, /signed|api_key|private/i)
  assert.deepEqual(getCadSecureUploadProviderDiagnostics({
    code: 'ECONNRESET',
    message: 'private signed URL'
  }), { code: CAD_SECURE_UPLOAD_ERROR_CODES.PROVIDER_UPLOAD_FAILED })
})

test('classifies provider rejection without exposing provider details', () => {
  const error = getCadSecureUploadProviderError({
    http_code: 401,
    message: 'invalid secret credential for private asset'
  })

  assert.equal(error.code, CAD_SECURE_UPLOAD_ERROR_CODES.PROVIDER_REJECTED)
  assert.equal(error.statusCode, 503)
  assert.equal(error.message, 'Secure CAD provider rejected the upload.')
  assert.doesNotMatch(error.message, /secret|credential|private asset/i)
  assert.deepEqual(getCadSecureUploadProviderDiagnostics({
    http_code: 401,
    message: 'secret credential'
  }), {
    code: CAD_SECURE_UPLOAD_ERROR_CODES.PROVIDER_REJECTED,
    httpStatus: 401
  })
})

test('uses private raw Cloudinary uploads for CAD and PDF assets without unsupported access or metadata options', () => {
  const options = buildCadSecureUploadOptions({ publicId: 'timestamp-part.step' })

  assert.deepEqual(options, {
    resource_type: 'raw',
    folder: 'cadtech/cad-files',
    public_id: 'timestamp-part.step',
    type: 'private'
  })
  assert.equal(Object.hasOwn(options, 'access_mode'), false)
  assert.equal(Object.hasOwn(options, 'metadata'), false)
  assert.equal(getCadSecureFileResourceType({ resourceType: 'raw', mimeType: 'application/pdf' }), 'raw')
  assert.equal(getCadSecureFileResourceType({ resourceType: 'image', mimeType: 'application/pdf' }), 'image')
  assert.equal(getCadSecureFileResourceType({ mimeType: 'image/jpeg' }), 'image')
  assert.equal(getCadSecureFileResourceType({ mimeType: 'application/pdf' }), 'raw')
})

test('caps secure CAD uploads to Cloudinary non-chunked upload size', () => {
  assert.ok(getCadSecureStorageMaxBytes() > 0)
  assert.ok(getCadSecureStorageMaxBytes() <= 100 * 1000 * 1000)
})

test('CAD upload validation rejects empty files before storage', () => {
  assert.throws(
    () => validateCadSecureFileUpload({ originalName: 'assembly.step', mimeType: 'application/step', sizeBytes: 0 }),
    /CAD file cannot be empty/
  )
})

test('CAD upload validation rejects unsupported extensions and oversized files', () => {
  assert.throws(
    () => validateCadSecureFileUpload({ originalName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 20 }),
    /Unsupported CAD file type/
  )
  assert.throws(
    () => validateCadSecureFileUpload({ originalName: 'assembly.step', mimeType: 'application/step', sizeBytes: Number(process.env.CAD_FILE_UPLOAD_MAX_BYTES || 52428800) + 1 }),
    /exceeds the .* upload limit/
  )
})

test('course media validation accepts thumbnail, video, PDF and resource types', () => {
  assert.equal(validateCourseMediaUpload({ kind: 'thumbnail', originalName: 'cover.webp', mimeType: 'image/webp', sizeBytes: 1024 }).extension, 'webp')
  assert.equal(validateCourseMediaUpload({ kind: 'video', originalName: 'lesson.mp4', mimeType: 'video/mp4', sizeBytes: 1024 }).extension, 'mp4')
  assert.equal(validateCourseMediaUpload({ kind: 'pdf', originalName: 'lesson.pdf', mimeType: 'application/pdf', sizeBytes: 1024 }).extension, 'pdf')
  assert.equal(validateCourseMediaUpload({ kind: 'resource', originalName: 'notes.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 1024 }).extension, 'docx')
})

test('course media validation rejects unsupported and oversized files', () => {
  assert.throws(() => validateCourseMediaUpload({ kind: 'pdf', originalName: 'lesson.exe', mimeType: 'application/pdf', sizeBytes: 1024 }), /Unsupported/)
  assert.throws(() => validateCourseMediaUpload({ kind: 'pdf', originalName: 'lesson.pdf', mimeType: 'application/pdf', sizeBytes: Number(process.env.COURSE_MEDIA_UPLOAD_MAX_BYTES || 104857600) + 1 }), /exceeds the .* upload limit/)
})

test('CAD preview image validation accepts web images and rejects other formats', () => {
  assert.equal(validateCadPreviewImageUpload({ originalName: 'preview.png', mimeType: 'image/png', sizeBytes: 1024 }).extension, 'png')
  assert.throws(() => validateCadPreviewImageUpload({ originalName: 'preview.svg', mimeType: 'image/svg+xml', sizeBytes: 1024 }), /Unsupported/)
})