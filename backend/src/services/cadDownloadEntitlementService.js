import mongoose from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { CadDownloadEntitlement, serializeCadDownloadEntitlement } from '../models/CadDownloadEntitlement.js'
import { CadOrder } from '../models/CadOrder.js'
import { CadProduct } from '../models/CadProduct.js'
import {
  createCadDownloadEntitlementRecord,
  getActiveCadEntitlementForUserProduct,
  findCadEntitlementById,
  listCadEntitlementsForStudent,
  updateCadEntitlementStatus
} from '../repositories/cadDownloadEntitlementRepository.js'
import {
  buildPrivateCadDownloadUrl,
  assertCadSecureStorageAvailable,
  getCadSecureFileResourceType
} from '../config/storage.js'

const getProductSnapshot = (product) => ({
  title: product?.title || null,
  slug: product?.slug || null,
  thumbnailUrl: Array.isArray(product?.previewImages) && product.previewImages.length > 0 ? product.previewImages[0]?.url || null : null
})

export const grantCadProductAccess = async ({ userId, productId, source = 'admin_grant', grantedBy = null, orderId = null, reason = null, productSnapshot = null }) => {
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(productId)) {
    throw new AppError('A valid user and CAD product are required.', 400)
  }

  const product = await CadProduct.findById(productId).lean()
  if (!product) throw new AppError('CAD product not found.', 404)

  const existing = await getActiveCadEntitlementForUserProduct({ userId, productId })
  if (existing) return existing

  const record = await createCadDownloadEntitlementRecord({
    userId,
    productId,
    orderId,
    productSnapshot: productSnapshot || getProductSnapshot(product),
    source,
    grantedBy,
    status: 'active'
  })

  return record
}

export const claimFreeCadProductAccess = async ({ userId, productId }) => {
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(productId)) {
    throw new AppError('A valid user and CAD product are required.', 400)
  }

  const product = await CadProduct.findById(productId).lean()
  if (!product) throw new AppError('CAD product not found.', 404)
  if (product.status !== 'published') throw new AppError('This CAD product is not available for claim.', 403)
  if (!product.isFree) throw new AppError('This CAD product is not free to claim.', 403)
  if (!product.secureFile || !product.secureFile.publicId) throw new AppError('This CAD file is not available for secure download yet.', 503)

  return grantCadProductAccess({
    userId,
    productId,
    source: 'free_claim',
    productSnapshot: getProductSnapshot(product)
  })
}

export const ensurePaidCadOrderEntitlement = async ({ userId, productId, orderId }) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new AppError('A valid CAD order is required.', 400)
  }

  return grantCadProductAccess({
    userId,
    productId,
    source: 'paid_order',
    orderId,
    productSnapshot: null
  })
}

export const serializeStudentCadDownloads = (entitlements, products = []) => {
  const productsById = new Map(products.map((product) => [String(product._id || product.id), product]))

  return entitlements.map((entitlement) => {
    const productId = entitlement.productId || null
    const currentProduct = productId ? productsById.get(String(productId)) : null
    const productSnapshot = entitlement.product || {}
    const secureFile = currentProduct?.secureFile
    const sizeInBytes = Number(secureFile?.sizeInBytes || 0)

    return {
      entitlementId: entitlement.id,
      id: entitlement.id,
      userId: entitlement.userId,
      productId,
      productSlug: currentProduct?.slug || productSnapshot.slug || null,
      title: currentProduct?.title || productSnapshot.title || 'CAD Product',
      thumbnail: currentProduct?.previewImages?.[0]?.url || productSnapshot.thumbnailUrl || null,
      category: currentProduct?.categoryId?.name || null,
      software: Array.isArray(currentProduct?.software) ? currentProduct.software : [],
      fileFormat: Array.isArray(currentProduct?.fileFormats) && currentProduct.fileFormats.length
        ? currentProduct.fileFormats.join(', ')
        : null,
      fileSize: Number.isFinite(sizeInBytes) && sizeInBytes > 0 ? sizeInBytes : null,
      entitlementSource: entitlement.source || 'paid_order',
      grantedAt: entitlement.grantedAt,
      downloadAvailable: Boolean(secureFile?.publicId)
    }
  })
}

export const listStudentCadDownloads = async ({ userId }) => {
  if (!mongoose.isValidObjectId(userId)) return []
  const entitlements = await listCadEntitlementsForStudent(userId)
  const productIds = entitlements.map((entitlement) => entitlement.productId).filter(mongoose.isValidObjectId)
  const products = productIds.length
    ? await CadProduct.find({ _id: { $in: productIds } })
      .select('title slug categoryId previewImages software fileFormats secureFile.publicId secureFile.sizeInBytes')
      .populate('categoryId', 'name')
      .lean()
    : []

  return serializeStudentCadDownloads(entitlements, products)
}

export const canUserAccessCadProduct = async ({ userId, productId }) => {
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(productId)) return false
  const entitlement = await getActiveCadEntitlementForUserProduct({ userId, productId })
  return Boolean(entitlement)
}

export const getCadProductAccessDetails = async ({ userId, productId }) => {
  const product = await CadProduct.findById(productId).lean()
  if (!product) throw new AppError('CAD product not found.', 404)

  const entitlement = await getActiveCadEntitlementForUserProduct({ userId, productId })
  return {
    productId: String(product._id),
    hasAccess: Boolean(entitlement),
    entitlementId: entitlement?.id || null,
    productTitle: product.title,
    productSlug: product.slug,
    secureStorageAvailable: Boolean(product.secureFile && product.secureFile.publicId)
  }
}

export const createCadDownloadRequester = ({
  findEntitlementById = findCadEntitlementById,
  findActiveEntitlement = getActiveCadEntitlementForUserProduct,
  findProductById = (id) => CadProduct.findById(id).lean(),
  assertStorageAvailable = assertCadSecureStorageAvailable,
  buildDownloadUrl = buildPrivateCadDownloadUrl
} = {}) => async ({ userId, entitlementId, productId }) => {
  const entitlement = entitlementId ? await findEntitlementById(entitlementId) : null
  if (entitlementId && !entitlement) throw new AppError('CAD download was not found.', 404)

  const activeEntitlement = entitlement || await findActiveEntitlement({ userId, productId })
  if (!activeEntitlement) throw new AppError('You do not have access to this CAD product.', 403)
  if (String(activeEntitlement.userId) !== String(userId)) throw new AppError('You do not have access to this CAD product.', 403)

  const product = await findProductById(activeEntitlement.productId)
  if (!product) throw new AppError('CAD product not found.', 404)

  if (!product.secureFile || !product.secureFile.publicId) {
    throw new AppError('This CAD file is not available for secure download yet.', 503)
  }

  assertStorageAvailable()

  const url = buildDownloadUrl({
    publicId: product.secureFile.publicId,
    resourceType: getCadSecureFileResourceType(product.secureFile),
    originalName: product.secureFile.originalName || product.title,
    expiresInSeconds: Number(product.secureFile.signedUrlTtlSeconds || 3600)
  })

  return {
    entitlementId: activeEntitlement.id,
    productId: activeEntitlement.productId,
    productTitle: product.title,
    downloadUrl: url,
    fileName: product.secureFile.originalName || `${product.slug || product.title}.zip`,
    expiresInSeconds: Number(product.secureFile.signedUrlTtlSeconds || 3600),
    provider: product.secureFile.provider || 'cloudinary'
  }
}

export const requestCadDownload = createCadDownloadRequester()

export const reconcilePaidCadOrderEntitlements = async () => {
  const paidOrders = await CadOrder.find({ status: 'paid' }).sort({ updatedAt: -1 }).lean()
  let inspected = 0
  let created = 0
  let skipped = 0
  let failed = 0

  for (const order of paidOrders) {
    inspected += 1
    try {
      if (!order?.userId || !order?.productId) {
        failed += 1
        continue
      }

      const active = await getActiveCadEntitlementForUserProduct({ userId: order.userId, productId: order.productId })
      if (active) {
        skipped += 1
        continue
      }

      await grantCadProductAccess({
        userId: order.userId,
        productId: order.productId,
        source: 'paid_order',
        orderId: order._id,
        productSnapshot: order.productSnapshot || null
      })
      created += 1
    } catch (error) {
      failed += 1
    }
  }

  return { inspected, created, skipped, failed }
}

export const revokeCadProductAccess = async ({ entitlementId, revokedBy, reason }) => {
  if (!mongoose.isValidObjectId(entitlementId)) throw new AppError('A valid entitlement is required.', 400)
  const entitlement = await findCadEntitlementById(entitlementId)
  if (!entitlement) throw new AppError('CAD download entitlement not found.', 404)
  if (entitlement.status !== 'active') return entitlement

  return updateCadEntitlementStatus({ entitlementId, status: 'revoked', revokedBy, revocationReason: reason })
}

export const restoreCadProductAccess = async ({ entitlementId, restoredBy }) => {
  if (!mongoose.isValidObjectId(entitlementId)) throw new AppError('A valid entitlement is required.', 400)
  const entitlement = await findCadEntitlementById(entitlementId)
  if (!entitlement) throw new AppError('CAD download entitlement not found.', 404)
  if (entitlement.status === 'active') return entitlement

  return updateCadEntitlementStatus({ entitlementId, status: 'active', expiresAt: null })
}

export default {
  grantCadProductAccess,
  ensurePaidCadOrderEntitlement,
  listStudentCadDownloads,
  canUserAccessCadProduct,
  getCadProductAccessDetails,
  requestCadDownload,
  revokeCadProductAccess,
  restoreCadProductAccess,
  claimFreeCadProductAccess,
  reconcilePaidCadOrderEntitlements
}
