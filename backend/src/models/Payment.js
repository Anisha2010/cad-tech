import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', default: null },
  provider: { type: String, enum: ['razorpay'], required: true, default: 'razorpay' },
  providerOrderId: { type: String, required: true, unique: true, trim: true },
  providerPaymentId: { type: String, default: null, trim: true },
  receipt: { type: String, required: true, trim: true },
  amountInPaise: { type: Number, required: true, min: 1, validate: Number.isInteger },
  currency: { type: String, required: true, uppercase: true, trim: true },
  status: { type: String, enum: ['creating', 'created', 'pending', 'paid', 'failed', 'refunded'], default: 'created' },
  verifiedAt: { type: Date, default: null },
  failedAt: { type: Date, default: null },
  refundedAt: { type: Date, default: null },
  failureCode: { type: String, default: null, trim: true },
  failureDescription: { type: String, default: null, trim: true },
  legacyId: { type: String, default: null, trim: true },
  requiresReview: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false })

paymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true })
paymentSchema.index({ userId: 1, courseId: 1 }, { unique: true, partialFilterExpression: { status: 'creating' } })
paymentSchema.index({ userId: 1, createdAt: -1 })
paymentSchema.index({ status: 1, updatedAt: -1 })

export const serializePayment = (payment) => {
  const value = typeof payment.toObject === 'function' ? payment.toObject() : payment
  const course = value.courseId && typeof value.courseId === 'object' ? value.courseId : null
  return {
    id: String(value._id || value.id),
    courseSlug: course?.slug,
    courseTitle: course?.title,
    amountInPaise: value.amountInPaise,
    currency: value.currency,
    status: value.status,
    createdAt: value.createdAt?.toISOString?.() || value.createdAt,
    verifiedAt: value.verifiedAt?.toISOString?.() || value.verifiedAt
  }
}

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema)
export default Payment