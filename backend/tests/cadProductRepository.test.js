import test from 'node:test'
import assert from 'node:assert/strict'
import { CadProduct } from '../src/models/CadProduct.js'
import { updateCadProductRecord } from '../src/repositories/cadProductRepository.js'

const replace = (target, key, value) => {
  const original = target[key]
  target[key] = value
  return () => { target[key] = original }
}

test('returns persisted secure-file metadata to the admin upload flow when requested', async () => {
  const document = {
    _id: '507f1f77bcf86cd799439012',
    title: 'Purchased model',
    slug: 'purchased-model',
    categoryId: '507f1f77bcf86cd799439013',
    secureFile: {
      provider: 'cloudinary',
      publicId: 'private-file',
      originalName: 'model.step',
      mimeType: 'application/step',
      sizeInBytes: 4096
    }
  }
  let query
  const restore = replace(CadProduct, 'findByIdAndUpdate', (...args) => {
    query = args
    return {
      populate() { return this },
      lean: async () => document
    }
  })

  try {
    const product = await updateCadProductRecord(
      document._id,
      { secureFile: document.secureFile },
      { includeSecureFile: true }
    )
    assert.equal(product.secureFile.publicId, 'private-file')
    assert.equal(query[1].$set.secureFile.publicId, 'private-file')
  } finally {
    restore()
  }
})

test('continues to omit secure-file metadata from ordinary product update responses', async () => {
  const document = {
    _id: '507f1f77bcf86cd799439012',
    title: 'Purchased model',
    slug: 'purchased-model',
    categoryId: '507f1f77bcf86cd799439013',
    secureFile: { publicId: 'private-file' }
  }
  const restore = replace(CadProduct, 'findByIdAndUpdate', () => ({
    populate() { return this },
    lean: async () => document
  }))

  try {
    const product = await updateCadProductRecord(document._id, { title: document.title })
    assert.equal(product.secureFile, undefined)
  } finally {
    restore()
  }
})
