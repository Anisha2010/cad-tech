import test from 'node:test'
import assert from 'node:assert/strict'
import { getCadSecureUploadErrorMessage, getCadStorageStatus } from '../src/utils/cadStorageStatus.js'

test('reports a neutral state when there is no secure file and no confirmed storage error', () => {
  assert.equal(getCadStorageStatus({ secureFile: null }), 'No secure file uploaded')
})

test('shows storage unavailable only for confirmed missing storage configuration', () => {
  assert.equal(
    getCadStorageStatus({ secureFile: null, errorCode: 'CAD_STORAGE_NOT_CONFIGURED' }),
    'Storage Unavailable'
  )
})

test('shows upload failure only for confirmed provider/network failure or provider rejection', () => {
  assert.equal(
    getCadStorageStatus({ secureFile: null, errorCode: 'CAD_PROVIDER_UPLOAD_FAILED' }),
    'Upload Failed'
  )
  assert.equal(
    getCadStorageStatus({ secureFile: null, errorCode: 'CAD_PROVIDER_REJECTED' }),
    'Upload Failed'
  )
})

test('shows storage ready when a secure file exists', () => {
  assert.equal(getCadStorageStatus({ secureFile: { originalName: 'assembly.step' } }), 'Storage Ready')
})

test('provides sanitized messages for secure upload error categories', () => {
  assert.equal(
    getCadSecureUploadErrorMessage('CAD_STORAGE_NOT_CONFIGURED'),
    'Secure CAD uploads are temporarily unavailable.'
  )
  assert.equal(
    getCadSecureUploadErrorMessage('CAD_PROVIDER_UPLOAD_FAILED'),
    'Secure CAD upload failed. Please try again later.'
  )
  assert.equal(
    getCadSecureUploadErrorMessage('CAD_PROVIDER_REJECTED'),
    'Secure CAD provider rejected the upload.'
  )
})
