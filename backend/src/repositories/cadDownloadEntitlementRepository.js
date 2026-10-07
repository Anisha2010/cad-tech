import mongoose from 'mongoose'
import { CadDownloadEntitlement, serializeCadDownloadEntitlement } from '../models/CadDownloadEntitlement.js'

export const createCadDownloadEntitlementRecord = async ({ userId, productId, orderId = null, productSnapshot = null, source, grantedBy = null, status = 'active', expiresAt = null }) => {
  const document = await CadDownloadEntitlement.create({
    userId: new mongoose.Types.ObjectId(String(userId)),
    productId: new mongoose.Types.ObjectId(String(productId)),
    orderId: orderId ? new mongoose.Types.ObjectId(String(orderId)) : null,
    productSnapshot,
    source,
    grantedBy: grantedBy ? new mongoose.Types.ObjectId(String(grantedBy)) : null,
    status,
    expiresAt: expiresAt ? new Date(expiresAt) : null
  })

  return serializeCadDownloadEntitlement(document)
}

export const getActiveCadEntitlementForUserProduct = async ({ userId, productId }) => {
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(productId)) return null

  const document = await CadDownloadEntitlement.findOne({
    userId: new mongoose.Types.ObjectId(String(userId)),
    productId: new mongoose.Types.ObjectId(String(productId)),
    status: 'active'
  }).lean()

  return document ? serializeCadDownloadEntitlement(document) : null
}

export const findCadEntitlementById = async (entitlementId) => {
  if (!mongoose.isValidObjectId(entitlementId)) return null

  const document = await CadDownloadEntitlement.findById(entitlementId).lean()
  return document ? serializeCadDownloadEntitlement(document) : null
}

export const listCadEntitlementsForStudent = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) return []

  const documents = await CadDownloadEntitlement.find({
    userId: new mongoose.Types.ObjectId(String(userId)),
    status: 'active'
  }).sort({ grantedAt: -1, createdAt: -1 }).lean()

  return documents.map(serializeCadDownloadEntitlement)
}

export const updateCadEntitlementStatus = async ({ entitlementId, status, revokedBy = null, revocationReason = null, expiresAt = null }) => {
  if (!mongoose.isValidObjectId(entitlementId)) return null

  const updates = { status, updatedAt: new Date() }

  if (status === 'revoked') {
    updates.revokedAt = new Date()
    updates.revokedBy = revokedBy ? new mongoose.Types.ObjectId(String(revokedBy)) : null
    updates.revocationReason = revocationReason || null
    updates.expiresAt = expiresAt ? new Date(expiresAt) : (updates.expiresAt || null)
  } else if (status === 'active') {
    updates.revokedAt = null
    updates.revokedBy = null
    updates.revocationReason = null
    if (expiresAt) updates.expiresAt = new Date(expiresAt)
  }

  const document = await CadDownloadEntitlement.findByIdAndUpdate(entitlementId, { $set: updates }, { new: true, runValidators: true }).lean()
  return document ? serializeCadDownloadEntitlement(document) : null
}

export default {
  createCadDownloadEntitlementRecord,
  getActiveCadEntitlementForUserProduct,
  findCadEntitlementById,
  listCadEntitlementsForStudent,
  updateCadEntitlementStatus
}
