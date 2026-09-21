import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { getCourseById, getCourseBySlug } from '../repositories/courseRepository.js'
import { createVerifiedEnrollment as createMongoEnrollment } from '../repositories/enrollmentRepository.js'
import { attachEnrollment, createPayment, getPaymentById, getPaymentByProviderOrderId, getReusablePendingPayment, getStudentPayments as getStudentPaymentsFromRepository, markPaymentFailed, markPaymentPaid } from '../repositories/paymentRepository.js'
import { claimWebhookEvent, markWebhookEventFailed, markWebhookEventProcessed } from '../repositories/webhookEventRepository.js'
import { razorpay, razorpayConfigured, razorpayKeyId, razorpayWebhookSecret } from '../config/razorpay.js'
import { getActiveEnrollment } from './enrollmentService.js'

const requireRazorpay = () => { if (!razorpayConfigured) throw new AppError('Payment checkout is unavailable right now.', 503) }
const validPrice = (value) => Number.isInteger(value) && value > 0
const safeEqual = (received, expected) => {
  const receivedBuffer = Buffer.from(String(received || ''))
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
}
const sameId = (left, right) => String(left) === String(right)
const isTransactionUnsupported = (error) => /transaction numbers are only allowed|replica set|transaction is not supported|transactions are not supported/i.test(error?.message || '')

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

export const createOrder = async (userId, courseSlug) => {
  requireRazorpay()
  if (!mongoose.isValidObjectId(userId) || typeof courseSlug !== 'string' || !courseSlug.trim()) throw new AppError('A valid course is required.', 400)
  const course = await getCourseBySlug(courseSlug.trim())
  if (!course) throw new AppError('Course not found.', 404)
  if (!course.enrollmentOpen || !validPrice(course.priceInPaise) || course.currency !== 'INR') throw new AppError('Enrollment is currently unavailable for this course.', 503)
  if (await getActiveEnrollment(userId, course.slug)) throw new AppError('You are already enrolled in this course.', 409)
  const pending = await getReusablePendingPayment(userId, course.id)
  if (pending) return { keyId: razorpayKeyId, providerOrderId: pending.providerOrderId, amount: pending.amountInPaise, currency: pending.currency, courseSlug: course.slug, courseTitle: course.title }
  const receipt = `course_${course.slug}_${crypto.randomBytes(8).toString('hex')}`
  const order = await razorpay.orders.create({ amount: course.priceInPaise, currency: course.currency, receipt })
  const payment = await createPayment({ userId, courseId: course.id, enrollmentId: null, provider: 'razorpay', providerOrderId: order.id, providerPaymentId: null, receipt, amountInPaise: course.priceInPaise, currency: course.currency, status: 'pending', requiresReview: false })
  return { keyId: razorpayKeyId, providerOrderId: payment.providerOrderId, amount: payment.amountInPaise, currency: payment.currency, courseSlug: course.slug, courseTitle: course.title }
}

export const finalizeVerifiedPayment = async ({ paymentId, providerPaymentId }) => runWithOptionalTransaction(async (session) => {
  const storedPayment = await getPaymentById(paymentId, { session })
  if (!storedPayment) throw new AppError('Payment could not be verified.', 400)
  if (storedPayment.status === 'refunded' || storedPayment.status === 'failed') throw new AppError('Payment could not be verified.', 400)
  if (storedPayment.providerPaymentId && storedPayment.providerPaymentId !== providerPaymentId) throw new AppError('Payment could not be verified.', 400)
  const paidPayment = storedPayment.status === 'paid' ? storedPayment : await markPaymentPaid(storedPayment._id, providerPaymentId, { session })
  if (!paidPayment) throw new AppError('Payment could not be verified.', 400)
  const enrollment = await createMongoEnrollment({ userId: storedPayment.userId, courseId: storedPayment.courseId, paymentId: paidPayment._id }, { session })
  if (!enrollment) throw new AppError('Enrollment could not be created.', 500)
  await attachEnrollment(paidPayment._id, enrollment._id, { session })
  return enrollment
})

const verifySignature = ({ orderId, paymentId, signature }) => {
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(`${orderId}|${paymentId}`).digest('hex')
  return safeEqual(signature, expected)
}

export const verifyPayment = async ({ userId, orderId, paymentId, signature }) => {
  requireRazorpay()
  const payment = await getPaymentByProviderOrderId(orderId)
  if (!payment || !sameId(payment.userId, userId) || typeof paymentId !== 'string' || !signature) throw new AppError('Payment could not be verified.', 400)
  const course = await getCourseById(payment.courseId, { includeArchived: true })
  if (!course || payment.amountInPaise !== course.priceInPaise || payment.currency !== course.currency || !verifySignature({ orderId, paymentId, signature })) {
    await markPaymentFailed(payment._id, { code: 'verification_failed', description: 'Payment signature verification failed.' })
    throw new AppError('Payment could not be verified.', 400)
  }
  return finalizeVerifiedPayment({ paymentId: payment._id, providerPaymentId: paymentId })
}

export const reconcileWebhook = async (rawBody, signature) => {
  if (!razorpayWebhookSecret || !Buffer.isBuffer(rawBody) || !safeEqual(signature, crypto.createHmac('sha256', razorpayWebhookSecret).update(rawBody).digest('hex'))) throw new AppError('Invalid webhook signature.', 400)
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
        await finalizeVerifiedPayment({ paymentId: payment._id, providerPaymentId: entity.id })
      }
    } else if (event.event === 'payment.failed') {
      const payment = entity?.order_id ? await getPaymentByProviderOrderId(entity.order_id) : null
      if (payment) await markPaymentFailed(payment._id, { code: entity.code, description: entity.description })
    }
    await markWebhookEventProcessed(claimed.event._id)
    return null
  } catch (error) {
    await markWebhookEventFailed(claimed.event._id)
    throw error
  }
}

export const getStudentPayments = ({ userId, page, limit }) => getStudentPaymentsFromRepository({ userId, page, limit })
