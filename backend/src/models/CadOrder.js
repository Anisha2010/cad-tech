import mongoose from 'mongoose'

const productSnapshotSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, default: null },
  imageUrl: { type: String, default: null, trim: true }
}, { _id: false })

const cadOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'CadProduct', required: true, index: true },
  productSnapshot: { type: productSnapshotSchema, required: true },
  provider: { type: String, enum: ['razorpay'], required: true, default: 'razorpay' },
  providerOrderId: { type: String, required: true, unique: true, trim: true },
  providerPaymentId: { type: String, default: null, trim: true },
  receipt: { type: String, required: true, trim: true },
  amountInPaise: { type: Number, required: true, min: 1, validate: Number.isInteger },
  currency: { type: String, required: true, uppercase: true, trim: true },
  status: { type: String, enum: ['created', 'pending', 'paid', 'failed', 'refunded'], default: 'created', index: true },
  verifiedAt: { type: Date, default: null },
  failedAt: { type: Date, default: null },
  refundedAt: { type: Date, default: null },
  failureCode: { type: String, default: null, trim: true },
  failureDescription: { type: String, default: null, trim: true },
  requiresReview: { type: Boolean, default: false },
  legacyId: { type: String, default: null, trim: true }
}, { timestamps: true, versionKey: false })

cadOrderSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true })
cadOrderSchema.index({ userId: 1, createdAt: -1 })
cadOrderSchema.index({ userId: 1, productId: 1 })
cadOrderSchema.index({ status: 1, updatedAt: -1 })

export const serializeCadOrder = (cadOrder) => {
  const value = typeof cadOrder.toObject === 'function' ? cadOrder.toObject() : cadOrder
  const product = value.productSnapshot || {}
  return {
    id: String(value._id || value.id),
    productId: value.productId ? String(value.productId) : null,
    productTitle: product.title || 'CAD Product',
    productSlug: product.slug || null,
    productCategoryId: product.categoryId ? String(product.categoryId) : null,
    productImageUrl: product.imageUrl || null,
    amountInPaise: value.amountInPaise,
    currency: value.currency,
    status: value.status,
    provider: value.provider,
    providerOrderId: value.providerOrderId,
    providerPaymentId: value.providerPaymentId || null,
    createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : null,
    verifiedAt: value.verifiedAt ? new Date(value.verifiedAt).toISOString() : null,
    failedAt: value.failedAt ? new Date(value.failedAt).toISOString() : null
  }
}

export const CadOrder = mongoose.models.CadOrder || mongoose.model('CadOrder', cadOrderSchema)
export default CadOrder
