import mongoose from 'mongoose'
import { CadOrder, serializeCadOrder } from '../models/CadOrder.js'

const validId = (value) => mongoose.isValidObjectId(value)

export const createCadOrder = async (fields, options = {}) => {
  const allowedFields = ['userId', 'productId', 'productSnapshot', 'provider', 'providerOrderId', 'providerPaymentId', 'receipt', 'amountInPaise', 'currency', 'status', 'requiresReview', 'legacyId', 'verifiedAt', 'failedAt', 'refundedAt', 'failureCode', 'failureDescription']
  const safeFields = Object.fromEntries(allowedFields.filter((field) => Object.hasOwn(fields, field)).map((field) => [field, fields[field]]))
  const order = await CadOrder.create([safeFields], options.session ? { session: options.session } : undefined)
  return order[0]
}

export const getCadOrderById = async (id, options = {}) => validId(id) ? CadOrder.findById(id).session(options.session || null).lean() : null
export const getCadOrderByProviderOrderId = async (providerOrderId, options = {}) => CadOrder.findOne({ providerOrderId }).session(options.session || null).lean()
export const getCadOrderByProviderPaymentId = async (providerPaymentId, options = {}) => CadOrder.findOne({ providerPaymentId }).session(options.session || null).lean()

export const getReusablePendingCadOrder = async (userId, productId, options = {}) => {
  if (!validId(userId) || !validId(productId)) return null
  return CadOrder.findOne({ userId, productId, status: { $in: ['created', 'pending'] } }).sort({ createdAt: -1 }).session(options.session || null).lean()
}

export const markCadOrderPaid = async (id, providerPaymentId, options = {}) => {
  const order = await CadOrder.findOneAndUpdate(
    { _id: id, status: { $in: ['created', 'pending', 'paid'] } },
    { $set: { status: 'paid', providerPaymentId, verifiedAt: new Date(), failedAt: null, failureCode: null, failureDescription: null } },
    { new: true, session: options.session }
  ).lean()
  return order
}

export const markCadOrderFailed = async (id, failure = {}, options = {}) => CadOrder.findOneAndUpdate(
  { _id: id, status: { $in: ['created', 'pending', 'failed'] } },
  { $set: { status: 'failed', failedAt: new Date(), failureCode: failure.code || null, failureDescription: failure.description || null } },
  { new: true, session: options.session }
).lean()

export const markCadOrderRefunded = async (id, options = {}) => CadOrder.findOneAndUpdate(
  { _id: id, status: 'paid' },
  { $set: { status: 'refunded', refundedAt: new Date() } },
  { new: true, session: options.session }
).lean()

export const getStudentCadOrders = async ({ userId, page = 1, limit = 12 } = {}) => {
  if (!validId(userId)) return { orders: [], totalItems: 0 }
  const filter = { userId }
  const [totalItems, orders] = await Promise.all([
    CadOrder.countDocuments(filter),
    CadOrder.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()
  ])

  return { orders: orders.map(serializeCadOrder), totalItems }
}

export const getAdminCadOrders = async ({ page = 1, limit = 12 } = {}) => {
  const safePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 12
  const maxLimit = Math.min(safeLimit, 50)
  const [totalItems, orders] = await Promise.all([
    CadOrder.countDocuments(),
    CadOrder.find().sort({ createdAt: -1 }).skip((safePage - 1) * maxLimit).limit(maxLimit).lean()
  ])

  return { orders: orders.map(serializeCadOrder), totalItems, page: safePage, limit: maxLimit, totalPages: totalItems ? Math.ceil(totalItems / maxLimit) : 0 }
}
