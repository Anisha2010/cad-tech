import mongoose from 'mongoose'

const productSnapshotSchema = new mongoose.Schema({
  title: { type: String, default: null, trim: true },
  slug: { type: String, default: null, trim: true },
  thumbnailUrl: { type: String, default: null, trim: true }
}, { _id: false })

const cadDownloadEntitlementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'CadProduct', required: true, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'CadOrder', default: null, index: true },
  productSnapshot: { type: productSnapshotSchema, default: null },
  source: { type: String, enum: ['paid_order', 'free_claim', 'admin_grant'], required: true, index: true },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active', index: true },
  grantedAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  revocationReason: { type: String, default: null, trim: true },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false })

cadDownloadEntitlementSchema.index({ userId: 1, productId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } })

export const serializeCadDownloadEntitlement = (entitlement) => {
  const value = typeof entitlement?.toObject === 'function' ? entitlement.toObject() : (entitlement || {})
  const product = value.productSnapshot || {}

  return {
    id: String(value._id || value.id),
    userId: value.userId ? String(value.userId) : null,
    productId: value.productId ? String(value.productId) : null,
    orderId: value.orderId ? String(value.orderId) : null,
    source: value.source || 'paid_order',
    status: value.status || 'active',
    grantedAt: value.grantedAt ? new Date(value.grantedAt).toISOString() : null,
    revokedAt: value.revokedAt ? new Date(value.revokedAt).toISOString() : null,
    revokedBy: value.revokedBy ? String(value.revokedBy) : null,
    revocationReason: value.revocationReason || null,
    expiresAt: value.expiresAt ? new Date(value.expiresAt).toISOString() : null,
    createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : null,
    updatedAt: value.updatedAt ? new Date(value.updatedAt).toISOString() : null,
    product: {
      title: product.title || null,
      slug: product.slug || null,
      thumbnailUrl: product.thumbnailUrl || null,
    }
  }
}

export const CadDownloadEntitlement = mongoose.models.CadDownloadEntitlement || mongoose.model('CadDownloadEntitlement', cadDownloadEntitlementSchema)
export default CadDownloadEntitlement
