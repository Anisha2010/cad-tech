import test from 'node:test'
import assert from 'node:assert/strict'
import { SiteSettings } from '../src/models/SiteSettings.js'
import { validateFounderImageUpload } from '../src/config/storage.js'

const founderImagePath = 'founderImageUrl'

test('site settings stores a dedicated founder image URL', () => {
  const schema = SiteSettings.schema
  assert.equal(schema.path(founderImagePath)?.instance, 'String')
  assert.equal(schema.path(founderImagePath)?.defaultValue, '')
})

test('founder image validation accepts supported image types and enforces the existing size limit', () => {
  const result = validateFounderImageUpload({
    originalName: 'founder.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024
  })

  assert.equal(result.extension, 'jpg')
  assert.equal(result.mimeType, 'image/jpeg')
  assert.throws(() => validateFounderImageUpload({
    originalName: 'founder.exe',
    mimeType: 'application/x-msdownload',
    sizeBytes: 1024
  }), /Unsupported founder image file type/)
  assert.throws(() => validateFounderImageUpload({
    originalName: 'founder.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 10_485_761
  }), /exceeds the 10485760 byte upload limit/)
})
