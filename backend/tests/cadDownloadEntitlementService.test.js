import test from 'node:test'
import assert from 'node:assert/strict'
import { CadDownloadEntitlement } from '../src/models/CadDownloadEntitlement.js'
import { CadProduct } from '../src/models/CadProduct.js'
import {
  createCadDownloadRequester,
  listStudentCadDownloads
} from '../src/services/cadDownloadEntitlementService.js'

const studentId = '507f1f77bcf86cd799439011'
const otherStudentId = '507f1f77bcf86cd799439013'
const productId = '507f1f77bcf86cd799439012'
const entitlementId = '507f1f77bcf86cd799439014'

const replace = (target, key, value) => {
  const original = target[key]
  target[key] = value
  return () => { target[key] = original }
}

test('lists only this student’s active entitlements and retains purchases without a secure file', async () => {
  const documents = [
    {
      _id: entitlementId,
      userId: studentId,
      productId,
      source: 'paid_order',
      status: 'active',
      grantedAt: new Date('2026-10-01T00:00:00.000Z'),
      productSnapshot: { title: 'Purchased model', slug: 'purchased-model' }
    },
    {
      _id: '507f1f77bcf86cd799439015',
      userId: otherStudentId,
      productId,
      source: 'paid_order',
      status: 'active'
    },
    {
      _id: '507f1f77bcf86cd799439016',
      userId: studentId,
      productId,
      source: 'paid_order',
      status: 'revoked'
    }
  ]
  const product = {
    _id: productId,
    title: 'Purchased model',
    slug: 'purchased-model',
    categoryId: { name: 'Mechanical' },
    previewImages: [{ url: 'https://images.example/model.png' }],
    software: ['CAD'],
    fileFormats: ['STEP'],
    secureFile: null
  }
  let entitlementFilter
  let productFilter

  const restoreEntitlements = replace(CadDownloadEntitlement, 'find', (filter) => {
    entitlementFilter = filter
    return {
      sort() { return this },
      lean: async () => documents.filter((document) =>
        String(document.userId) === String(filter.userId) && document.status === filter.status
      )
    }
  })
  const restoreProducts = replace(CadProduct, 'find', (filter) => {
    productFilter = filter
    return {
      select() { return this },
      populate() { return this },
      lean: async () => [product].filter((document) => filter._id.$in.some((id) => String(id) === String(document._id)))
    }
  })

  let downloads
  try {
    downloads = await listStudentCadDownloads({ userId: studentId })
  } finally {
    restoreEntitlements()
    restoreProducts()
  }

  assert.equal(String(entitlementFilter.userId), studentId)
  assert.equal(entitlementFilter.status, 'active')
  assert.deepEqual(productFilter._id.$in.map(String), [productId])
  assert.equal(downloads.length, 1)
  assert.equal(downloads[0].userId, studentId)
  assert.equal(downloads[0].title, 'Purchased model')
  assert.equal(downloads[0].productSlug, 'purchased-model')
  assert.equal(downloads[0].downloadAvailable, false)
  assert.equal(downloads[0].fileSize, null)
})

test('marks a product downloadable only when its private file metadata exists', async () => {
  const download = await listStudentCadDownloadsForFixture({
    secureFile: { publicId: 'private-asset', sizeInBytes: 4096 }
  })

  assert.equal(download.downloadAvailable, true)
  assert.equal(download.fileSize, 4096)
  assert.equal(Object.hasOwn(download, 'publicId'), false)
  assert.equal(Object.hasOwn(download, 'secureFile'), false)
})

async function listStudentCadDownloadsForFixture({ secureFile }) {
  const document = {
    _id: entitlementId,
    userId: studentId,
    productId,
    source: 'paid_order',
    status: 'active',
    productSnapshot: { title: 'Purchased model', slug: 'purchased-model' }
  }
  const restoreEntitlements = replace(CadDownloadEntitlement, 'find', () => ({
    sort() { return this },
    lean: async () => [document]
  }))
  const restoreProducts = replace(CadProduct, 'find', () => ({
    select() { return this },
    populate() { return this },
    lean: async () => [{
      _id: productId,
      title: 'Purchased model',
      slug: 'purchased-model',
      secureFile
    }]
  }))

  try {
    return (await listStudentCadDownloads({ userId: studentId }))[0]
  } finally {
    restoreEntitlements()
    restoreProducts()
  }
}

test('denies an entitlement belonging to another student without building a download URL', async () => {
  let urlBuilderCalled = false
  const requestDownload = createCadDownloadRequester({
    findEntitlementById: async () => ({
      id: entitlementId,
      userId: otherStudentId,
      productId
    }),
    findProductById: async () => assert.fail('Must not load a product for another student'),
    assertStorageAvailable: () => assert.fail('Must not check storage for another student'),
    buildDownloadUrl: () => {
      urlBuilderCalled = true
      return 'private-url'
    }
  })

  await assert.rejects(
    () => requestDownload({ userId: studentId, entitlementId }),
    (error) => error.statusCode === 403
  )
  assert.equal(urlBuilderCalled, false)
})

test('returns a download URL for a valid owned entitlement with a stored private file', async () => {
  const downloadUrl = 'signed-test-url'
  const requestDownload = createCadDownloadRequester({
    findActiveEntitlement: async ({ userId: requestedUserId, productId: requestedProductId }) =>
      requestedUserId === studentId && requestedProductId === productId
        ? { id: entitlementId, userId: studentId, productId }
        : null,
    findProductById: async () => ({
      title: 'Purchased model',
      slug: 'purchased-model',
      secureFile: {
        publicId: 'private-asset',
        originalName: 'purchased-model.step',
        mimeType: 'application/step',
        sizeInBytes: 4096
      }
    }),
    assertStorageAvailable: () => {},
    buildDownloadUrl: ({ publicId, resourceType, originalName }) => {
      assert.equal(publicId, 'private-asset')
      assert.equal(resourceType, 'raw')
      assert.equal(originalName, 'purchased-model.step')
      return downloadUrl
    }
  })

  const result = await requestDownload({ userId: studentId, productId })

  assert.equal(result.downloadUrl, downloadUrl)
  assert.equal(result.fileName, 'purchased-model.step')
})

test('keeps every secure CAD download on the raw resource type even for image-like CAD MIME types', async () => {
  const requestDownload = createCadDownloadRequester({
    findActiveEntitlement: async () => ({ id: entitlementId, userId: studentId, productId }),
    findProductById: async () => ({
      title: 'Drawing',
      secureFile: {
        publicId: 'private-drawing',
        originalName: 'drawing.dwg',
        mimeType: 'image/x-dwg',
        resourceType: 'raw'
      }
    }),
    assertStorageAvailable: () => {},
    buildDownloadUrl: ({ resourceType }) => {
      assert.equal(resourceType, 'raw')
      return 'signed-test-url'
    }
  })

  const result = await requestDownload({ userId: studentId, productId })
  assert.equal(result.downloadUrl, 'signed-test-url')
})

test('does not generate a URL when an owned purchase has no secure file', async () => {
  const requestDownload = createCadDownloadRequester({
    findActiveEntitlement: async () => ({ id: entitlementId, userId: studentId, productId }),
    findProductById: async () => ({ title: 'Purchased model', secureFile: null }),
    assertStorageAvailable: () => assert.fail('Must reject before storage access'),
    buildDownloadUrl: () => assert.fail('Must not generate a URL')
  })

  await assert.rejects(
    () => requestDownload({ userId: studentId, productId }),
    (error) => error.statusCode === 503 && /not available for secure download/.test(error.message)
  )
})
