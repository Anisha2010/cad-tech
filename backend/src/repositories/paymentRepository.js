import mongoose from 'mongoose'
import { Payment, serializePayment } from '../models/Payment.js'

const validId = (value) => mongoose.isValidObjectId(value)

export const createPayment = async (fields, options = {}) => {
  const allowedFields = ['userId', 'courseId', 'enrollmentId', 'provider', 'providerOrderId', 'providerPaymentId', 'receipt', 'amountInPaise', 'currency', 'status', 'requiresReview', 'legacyId', 'verifiedAt', 'failedAt', 'refundedAt', 'failureCode', 'failureDescription']
  const safeFields = Object.fromEntries(allowedFields.filter((field) => Object.hasOwn(fields, field)).map((field) => [field, fields[field]]))
  const payment = await Payment.create([safeFields], options.session ? { session: options.session } : undefined)
  return payment[0]
}

export const getPaymentById = async (id, options = {}) => validId(id) ? Payment.findById(id).session(options.session || null).lean() : null
export const getPaymentByProviderOrderId = async (providerOrderId, options = {}) => Payment.findOne({ providerOrderId }).session(options.session || null).lean()
export const getPaymentByProviderPaymentId = async (providerPaymentId, options = {}) => Payment.findOne({ providerPaymentId }).session(options.session || null).lean()
export const getReusablePendingPayment = async (userId, courseId, options = {}) => {
  if (!validId(userId) || !validId(courseId)) return null
  return Payment.findOne({ userId, courseId, status: { $in: ['created', 'pending'] } }).sort({ createdAt: -1 }).session(options.session || null).lean()
}

export const markPaymentPaid = async (id, providerPaymentId, options = {}) => {
  const payment = await Payment.findOneAndUpdate(
    { _id: id, status: { $in: ['created', 'pending', 'paid'] } },
    { $set: { status: 'paid', providerPaymentId, verifiedAt: new Date(), failedAt: null, failureCode: null, failureDescription: null } },
    { new: true, session: options.session }
  ).lean()
  return payment
}

export const markPaymentFailed = async (id, failure = {}, options = {}) => Payment.findOneAndUpdate(
  { _id: id, status: { $in: ['created', 'pending', 'failed'] } },
  { $set: { status: 'failed', failedAt: new Date(), failureCode: failure.code || null, failureDescription: failure.description || null } },
  { new: true, session: options.session }
).lean()

export const markPaymentRefunded = async (id, options = {}) => Payment.findOneAndUpdate(
  { _id: id, status: 'paid' },
  { $set: { status: 'refunded', refundedAt: new Date() } },
  { new: true, session: options.session }
).lean()

export const attachEnrollment = async (id, enrollmentId, options = {}) => Payment.findOneAndUpdate(
  { _id: id, enrollmentId: null },
  { $set: { enrollmentId } },
  { new: true, session: options.session }
).lean()

export const getStudentPayments = async ({ userId, page = 1, limit = 12 }) => {
  if (!validId(userId)) return { payments: [], totalItems: 0 }
  const filter = { userId }
  const [totalItems, payments] = await Promise.all([
    Payment.countDocuments(filter),
    Payment.find(filter).populate({ path: 'courseId', select: 'slug title' }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
  ])
  return { payments: payments.map(serializePayment), totalItems }
}