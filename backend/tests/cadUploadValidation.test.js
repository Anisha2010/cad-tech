import test from 'node:test'
import assert from 'node:assert/strict'
import { validateCadPreviewImageUpload, validateCadSecureFileUpload, validateCourseMediaUpload } from '../src/config/storage.js'

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