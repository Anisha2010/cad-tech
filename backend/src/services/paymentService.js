import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { AppError } from '../utils/AppError.js'
import * as courseRepository from '../repositories/courseRepository.js'
import { createVerifiedEnrollment as createMongoEnrollment } from '../repositories/enrollmentRepository.js'
import * as paymentRepository from '../repositories/paymentRepository.js'
import * as webhookEventRepository from '../repositories/webhookEventRepository.js'
import { razorpay, razorpayConfigured, razorpayKeyId, razorpayWebhookSecret } from '../config/razorpay.js'
import * as enrollmentService from './enrollmentService.js'

const requireRazorpay = () => {
  if (!razorpayConfigured) {
    console.error('[Razorpay] Payment service is not configured.', {
      keyIdPresent: Boolean(process.env.RAZORPAY_KEY_ID),
      keySecretPresent: Boolean(process.env.RAZORPAY_KEY_SECRET),
      webhookSecretPresent: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
      keyIdTestMode: /^rzp_test_[A-Za-z0-9]+$/.test(String(process.env.RAZORPAY_KEY_ID || '').trim())
    })
    throw new AppError('Payment service is not configured.', 503, null, 'PAYMENT_SERVICE_NOT_CONFIGURED')
  }
}
const validPrice = (value) => Number.isInteger(value) && value > 0
const safeEqual = (received, expected) => {
  const receivedBuffer = Buffer.from(String(received || ''))
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
}
const sameId = (left, right) => String(left) === String(right)
const isTransactionUnsupported = (error) => /transaction numbers are only allowed|replica set|transaction is not supported|transactions are not supported/i.test(error?.message || '')
const orderReservationMaxAgeMs = 2 * 60 * 1000
const inFlightOrders = new Map()

const runWithOptionalTransaction = async (operation) => {
  const session = await mongoose.startSession()
  try {
    let result
    await session.withTransaction(async () => { result = await operation(session) })
    return result
  } catch (error) {
    if (!isTransactionUnsupported(error)) throw error
    return operation(null)
  } finally {
    await session.endSession()
  }
}

export const createOrderService = ({
  getCourseBySlug = courseRepository.getCourseBySlug,
  getActiveEnrollment = enrollmentService.getActiveEnrollment,
  getReusablePendingPayment = paymentRepository.getReusablePendingPayment,
  createPayment = paymentRepository.createPayment,
  updatePaymentProviderOrder = paymentRepository.updatePaymentProviderOrder,
  markPaymentFailed = paymentRepository.markPaymentFailed,
  razorpayClient = razorpay,
  paymentKeyId = razorpayKeyId
} = {}) => async (userId, courseSlug) => {
  const lockKey = `${userId}:${String(courseSlug || '').trim().toLowerCase()}`
  if (inFlightOrders.has(lockKey)) return inFlightOrders.get(lockKey)

  const request = (async () => {
  requireRazorpay()
  if (!mongoose.isValidObjectId(userId) || typeof courseSlug !== 'string' || !courseSlug.trim()) throw new AppError('A valid course is required.', 400)

  const course = await getCourseBySlug(courseSlug.trim())
  if (!course) throw new AppError('Course not found.', 404)
  if (course.status !== 'published') throw new AppError('This course is not currently available for enrollment.', 400)
  if (!course.enrollmentOpen) throw new AppError('Enrollment is currently closed for this course.', 400)
  if (!validPrice(course.priceInPaise) || course.currency !== 'INR') throw new AppError('This course is not priced for enrollment.', 422)
  if (await getActiveEnrollment(userId, course.slug)) throw new AppError('You are already enrolled in this course.', 409)

  const pending = await getReusablePendingPayment(userId, course.id)
  if (pending?.status === 'creating') {
    const reservationDate = new Date(pending.updatedAt || pending.createdAt || Date.now())
    if (Date.now() - reservationDate.getTime() <= orderReservationMaxAgeMs) return { status: 'pending', courseSlug: course.slug }
    await markPaymentFailed(pending._id, { code: 'order_reservation_expired', description: 'Order creation did not complete.' })
  }
  if (pending) return { keyId: paymentKeyId, providerOrderId: pending.providerOrderId, amount: pending.amountInPaise, currency: pending.currency, courseSlug: course.slug, courseTitle: course.title }

  const receipt = `course_${course.slug}_${crypto.randomBytes(8).toString('hex')}`
  let payment
  try {
    payment = await createPayment({ userId, courseId: course.id, enrollmentId: null, provider: 'razorpay', providerOrderId: `creating_${crypto.randomUUID()}`, providerPaymentId: null, receipt, amountInPaise: course.priceInPaise, currency: course.currency, status: 'creating', requiresReview: false })
  } catch (error) {
    if (error?.code !== 11000) throw error
    const existingPayment = await getReusablePendingPayment(userId, course.id)
    if (existingPayment?.status === 'creating') return { status: 'pending', courseSlug: course.slug }
    if (existingPayment) return { keyId: paymentKeyId, providerOrderId: existingPayment.providerOrderId, amount: existingPayment.amountInPaise, currency: existingPayment.currency, courseSlug: course.slug, courseTitle: course.title }
    throw error
  }

  let order
  try {
    order = await razorpayClient.orders.create({ amount: course.priceInPaise, currency: course.currency, receipt })
  } catch (error) {
    await markPaymentFailed(payment._id, { code: 'order_creation_failed', description: 'Razorpay order creation failed.' })
    console.error('[Razorpay] Order creation failed.', {
      code: error?.error?.code || error?.code || 'razorpay_order_error',
      description: error?.error?.description || error?.message || 'Razorpay order creation failed.'
    })
    throw new AppError('Payment service is temporarily unavailable.', 503, null, 'PAYMENT_PROVIDER_UNAVAILABLE')
  }

  const readyPayment = await updatePaymentProviderOrder(payment._id, order.id)
  if (!readyPayment) throw new AppError('Payment checkout is being prepared. Please check payment status shortly.', 503, null, 'PAYMENT_ORDER_PENDING')
  return { keyId: paymentKeyId, providerOrderId: readyPayment.providerOrderId, amount: readyPayment.amountInPaise, currency: readyPayment.currency, courseSlug: course.slug, courseTitle: course.title }
  })()
  inFlightOrders.set(lockKey, request)
  try {
    return await request
  } finally {
    inFlightOrders.delete(lockKey)
  }
}

export const createOrder = createOrderService()

export const createFinalizeVerifiedPaymentService = ({
  runTransaction = runWithOptionalTransaction,
  getPaymentById = paymentRepository.getPaymentById,
  markPaymentPaid = paymentRepository.markPaymentPaid,
  createEnrollment = createMongoEnrollment,
  attachEnrollment = paymentRepository.attachEnrollment
} = {}) => async ({ paymentId, providerPaymentId }) => runTransaction(async (session) => {
  const storedPayment = await getPaymentById(paymentId, { session })
  if (!storedPayment) throw new AppError('Payment could not be verified.', 400)
  if (storedPayment.status === 'refunded') throw new AppError('Payment could not be verified.', 400)
  if (storedPayment.providerPaymentId && storedPayment.providerPaymentId !== providerPaymentId) throw new AppError('Payment could not be verified.', 400)
  let paidPayment = storedPayment.status === 'paid' ? storedPayment : await markPaymentPaid(storedPayment._id, providerPaymentId, { session })
  if (!paidPayment) {
    const currentPayment = await getPaymentById(storedPayment._id, { session })
    if (currentPayment?.status === 'paid' && currentPayment.providerPaymentId === providerPaymentId) paidPayment = currentPayment
  }
  if (!paidPayment) throw new AppError('Payment could not be verified.', 400)
  const enrollment = await createEnrollment({ userId: storedPayment.userId, courseId: storedPayment.courseId, paymentId: paidPayment._id }, { session })
  if (!enrollment) throw new AppError('Enrollment could not be created.', 500)
  await attachEnrollment(paidPayment._id, enrollment._id, { session })
  return enrollment
})

export const finalizeVerifiedPayment = createFinalizeVerifiedPaymentService()

const verifySignature = ({ orderId, paymentId, signature }) => {
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(`${orderId}|${paymentId}`).digest('hex')
  return safeEqual(signature, expected)
}

export const verifyPayment = async ({ userId, orderId, paymentId, signature }) => {
  requireRazorpay()
  const payment = await paymentRepository.getPaymentByProviderOrderId(orderId)
  if (!payment || !sameId(payment.userId, userId) || typeof paymentId !== 'string' || !signature) throw new AppError('Payment could not be verified.', 400)
  const course = await courseRepository.getCourseById(payment.courseId, { includeArchived: true })
  if (!course || payment.amountInPaise !== course.priceInPaise || payment.currency !== course.currency || !verifySignature({ orderId, paymentId, signature })) {
    throw new AppError('Payment could not be verified.', 400)
  }
  return finalizeVerifiedPayment({ paymentId: payment._id, providerPaymentId: paymentId })
}

export const createPaymentStatusService = ({
  getCourseBySlug = courseRepository.getCourseBySlug,
  getActiveEnrollment = enrollmentService.getActiveEnrollment,
  getPaymentByProviderOrderId = paymentRepository.getPaymentByProviderOrderId,
  getReusablePendingPayment = paymentRepository.getReusablePendingPayment,
  markPaymentFailed = paymentRepository.markPaymentFailed,
  finalizePayment = finalizeVerifiedPayment,
  razorpayClient = razorpay
} = {}) => async ({ userId, courseSlug, orderId }) => {
  if (!mongoose.isValidObjectId(userId) || typeof courseSlug !== 'string' || !courseSlug.trim()) throw new AppError('A valid course is required.', 400)

  const course = await getCourseBySlug(courseSlug.trim(), { includeArchived: true })
  if (!course) throw new AppError('Course not found.', 404)

  const existingEnrollment = await getActiveEnrollment(userId, course.slug)
  if (existingEnrollment) return { status: 'enrolled', enrollment: existingEnrollment }

  const payment = orderId
    ? await getPaymentByProviderOrderId(orderId)
    : await getReusablePendingPayment(userId, course.id)
  if (!payment || !sameId(payment.userId, userId) || !sameId(payment.courseId, course.id)) return { status: 'not_enrolled', enrollment: null }
  if (payment.status === 'creating') return { status: 'pending', enrollment: null }
  if (payment.status === 'paid' && payment.providerPaymentId) {
    const enrollment = await finalizePayment({ paymentId: payment._id, providerPaymentId: payment.providerPaymentId })
    return { status: 'enrolled', enrollment }
  }
  if (payment.status === 'refunded') return { status: 'failed', enrollment: null }

  let providerPayments
  try {
    providerPayments = await razorpayClient.orders.fetchPayments(payment.providerOrderId)
  } catch {
    return { status: 'pending', enrollment: null }
  }

  const payments = Array.isArray(providerPayments?.items) ? providerPayments.items : []
  const captured = payments.find((item) => item.order_id === payment.providerOrderId && item.status === 'captured')
  if (captured) {
    if (captured.amount !== payment.amountInPaise || captured.currency !== payment.currency || !captured.id) return { status: 'pending', enrollment: null }
    const enrollment = await finalizePayment({ paymentId: payment._id, providerPaymentId: captured.id })
    return { status: 'enrolled', enrollment }
  }
  if (payments.length > 0 && payments.every((item) => item.status === 'failed')) {
    await markPaymentFailed(payment._id, { code: 'provider_payment_failed', description: 'All payment attempts for this order failed.' })
    return { status: 'failed', enrollment: null }
  }
  if (payments.length === 0 && !orderId) return { status: 'not_enrolled', enrollment: null }
  return { status: 'pending', enrollment: null }
}

export const getPaymentStatus = createPaymentStatusService()

export const createWebhookReconciler = ({
  webhookSecret = razorpayWebhookSecret,
  claimWebhookEvent = webhookEventRepository.claimWebhookEvent,
  markWebhookEventProcessed = webhookEventRepository.markWebhookEventProcessed,
  markWebhookEventFailed = webhookEventRepository.markWebhookEventFailed,
  getPaymentByProviderOrderId = paymentRepository.getPaymentByProviderOrderId,
  getCourseById = courseRepository.getCourseById,
  finalizePayment = finalizeVerifiedPayment,
} = {}) => async (rawBody, signature) => {
  if (!webhookSecret || !Buffer.isBuffer(rawBody) || !safeEqual(signature, crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex'))) throw new AppError('Invalid webhook signature.', 400)
  let event
  try { event = JSON.parse(rawBody.toString('utf8')) } catch { throw new AppError('Invalid webhook payload.', 400) }
  const eventId = typeof event.id === 'string' && event.id ? event.id : crypto.createHash('sha256').update(rawBody).digest('hex')
  const claimed = await claimWebhookEvent({ provider: 'razorpay', eventId, eventType: event.event || 'unknown' })
  if (!claimed.claimed) return null
  try {
    const entity = event.payload?.payment?.entity
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const payment = entity?.order_id ? await getPaymentByProviderOrderId(entity.order_id) : null
      const course = payment ? await getCourseById(payment.courseId) : null
      if (payment && entity.id) {
        if (!course || entity.amount !== payment.amountInPaise || entity.currency !== payment.currency) throw new AppError('Payment could not be verified.', 400)
        await finalizePayment({ paymentId: payment._id, providerPaymentId: entity.id })
      }
    }
    await markWebhookEventProcessed(claimed.event._id)
    return null
  } catch (error) {
    await markWebhookEventFailed(claimed.event._id)
    throw error
  }
}

export const reconcileWebhook = createWebhookReconciler()

export const getStudentPayments = ({ userId, page, limit }) => paymentRepository.getStudentPayments({ userId, page, limit })
