import crypto from 'node:crypto'
import { AppError } from '../utils/AppError.js'
import { getCourseBySlug } from '../config/courses.js'
import { razorpay, razorpayConfigured, razorpayKeyId, razorpayWebhookSecret } from '../config/razorpay.js'
import { createPayment, findPaymentByOrderId, findPendingPayment, updatePayment } from '../repositories/paymentRepository.js'
import { activateEnrollment, getActiveEnrollment } from './enrollmentService.js'

const requireRazorpay = () => { if (!razorpayConfigured) throw new AppError('Payment checkout is unavailable right now.', 503) }
const validPrice = (value) => Number.isInteger(value) && value > 0

export const createOrder = async (userId, courseSlug) => {
  requireRazorpay()
  if (typeof courseSlug !== 'string' || !courseSlug.trim()) throw new AppError('A valid course is required.', 400)
  const course = getCourseBySlug(courseSlug.trim())
  if (!course) throw new AppError('Course not found.', 404)
  if (!course.enrollmentOpen || !validPrice(course.priceInPaise)) throw new AppError('Enrollment is currently unavailable.', 503)
  if (getActiveEnrollment(userId, course.slug)) throw new AppError('You are already enrolled in this course.', 409)
  const pending = findPendingPayment(userId, course.slug)
  if (pending) return { keyId: razorpayKeyId, providerOrderId: pending.providerOrderId, amount: pending.amount, currency: pending.currency, courseSlug: course.slug, courseTitle: course.title }
  const order = await razorpay.orders.create({ amount: course.priceInPaise, currency: course.currency, receipt: `course_${course.slug}_${userId.slice(0, 8)}` })
  const payment = createPayment({ userId, courseSlug: course.slug, amount: course.priceInPaise, currency: course.currency, provider: 'razorpay', providerOrderId: order.id, providerPaymentId: null, status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  return { keyId: razorpayKeyId, providerOrderId: payment.providerOrderId, amount: payment.amount, currency: payment.currency, courseSlug: course.slug, courseTitle: course.title }
}

const safeEqual = (received, expected) => {
  const receivedBuffer = Buffer.from(String(received || ''))
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
}

export const verifyPayment = ({ userId, orderId, paymentId, signature }) => {
  requireRazorpay()
  const payment = findPaymentByOrderId(orderId)
  if (!payment || payment.userId !== userId) throw new AppError('Payment could not be verified.', 400)
  if (payment.status === 'paid') return activateEnrollment({ userId, courseSlug: payment.courseSlug, paymentId: payment.id })
  if (payment.status !== 'pending' || !paymentId || !signature) throw new AppError('Payment could not be verified.', 400)
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(`${orderId}|${paymentId}`).digest('hex')
  if (!safeEqual(signature, expected)) { updatePayment(payment.id, { status: 'failed' }); throw new AppError('Payment could not be verified.', 400) }
  updatePayment(payment.id, { providerPaymentId: paymentId, status: 'paid' })
  return activateEnrollment({ userId, courseSlug: payment.courseSlug, paymentId: payment.id })
}

export const reconcileWebhook = (rawBody, signature) => {
  if (!razorpayWebhookSecret || !safeEqual(signature, crypto.createHmac('sha256', razorpayWebhookSecret).update(rawBody).digest('hex'))) throw new AppError('Invalid webhook signature.', 400)
  const event = JSON.parse(rawBody.toString('utf8'))
  const entity = event.payload?.payment?.entity
  const payment = entity?.order_id ? findPaymentByOrderId(entity.order_id) : null
  if (!payment) return null
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    updatePayment(payment.id, { providerPaymentId: entity.id || payment.providerPaymentId, status: 'paid' })
    return activateEnrollment({ userId: payment.userId, courseSlug: payment.courseSlug, paymentId: payment.id })
  }
  if (event.event === 'payment.failed') updatePayment(payment.id, { providerPaymentId: entity.id || null, status: 'failed' })
  return null
}