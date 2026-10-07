import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { CadOrder, serializeCadOrder } from '../models/CadOrder.js'
import { CadProduct } from '../models/CadProduct.js'
import { createCadOrder as createCadOrderRecord, getCadOrderById, getCadOrderByProviderOrderId, getReusablePendingCadOrder, getStudentCadOrders, getAdminCadOrders, markCadOrderFailed, markCadOrderPaid } from '../repositories/cadOrderRepository.js'
import { claimWebhookEvent, markWebhookEventFailed, markWebhookEventProcessed } from '../repositories/webhookEventRepository.js'
import { ensurePaidCadOrderEntitlement } from './cadDownloadEntitlementService.js'
import { razorpay, razorpayConfigured, razorpayKeyId, razorpayWebhookSecret } from '../config/razorpay.js'

const requireRazorpay = () => {
  if (!razorpayConfigured) {
    console.error('[Razorpay] CAD payment service is not configured.', {
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

const verifySignature = ({ orderId, paymentId, signature }) => {
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(`${orderId}|${paymentId}`).digest('hex')
  return safeEqual(signature, expected)
}

export const createOrder = async (userId, productSlug) => {
  requireRazorpay()
  if (!mongoose.isValidObjectId(userId) || typeof productSlug !== 'string' || !productSlug.trim()) throw new AppError('A valid CAD product is required.', 400)

  const product = await CadProduct.findOne({ slug: productSlug.trim().toLowerCase(), status: 'published' }).lean()
  if (!product) throw new AppError('CAD product not found.', 404)
  if (product.isFree || !validPrice(product.salePriceInPaise) || product.currency !== 'INR') throw new AppError('This CAD product is not available for purchase.', 400)

  const pending = await getReusablePendingCadOrder(userId, product._id)
  if (pending) return { keyId: razorpayKeyId, providerOrderId: pending.providerOrderId, amount: pending.amountInPaise, currency: pending.currency, productSlug: product.slug, productTitle: product.title }

  const receipt = `cad_${product.slug}_${crypto.randomBytes(8).toString('hex')}`
  let order
  try {
    order = await razorpay.orders.create({ amount: product.salePriceInPaise, currency: product.currency, receipt })
  } catch (error) {
    console.error('[Razorpay] CAD order creation failed.', {
      code: error?.error?.code || error?.code || 'razorpay_order_error',
      description: error?.error?.description || error?.message || 'Razorpay order creation failed.'
    })
    throw new AppError('Payment service is temporarily unavailable.', 503, null, 'PAYMENT_PROVIDER_UNAVAILABLE')
  }

  const cadOrder = await createCadOrderRecord({
    userId,
    productId: product._id,
    productSnapshot: {
      title: product.title,
      slug: product.slug,
      categoryId: product.categoryId || null,
      imageUrl: Array.isArray(product.previewImages) && product.previewImages[0]?.url ? product.previewImages[0].url : null
    },
    provider: 'razorpay',
    providerOrderId: order.id,
    providerPaymentId: null,
    receipt,
    amountInPaise: product.salePriceInPaise,
    currency: product.currency,
    status: 'pending',
    requiresReview: false
  })

  return { keyId: razorpayKeyId, providerOrderId: cadOrder.providerOrderId, amount: cadOrder.amountInPaise, currency: cadOrder.currency, productSlug: product.slug, productTitle: product.title }
}

export const finalizeVerifiedCadOrder = async ({ orderId, providerPaymentId }) => runWithOptionalTransaction(async (session) => {
  const storedOrder = await getCadOrderById(orderId, { session })
  if (!storedOrder) throw new AppError('CAD payment could not be verified.', 400)
  if (storedOrder.status === 'refunded' || storedOrder.status === 'failed') throw new AppError('CAD payment could not be verified.', 400)
  if (storedOrder.providerPaymentId && storedOrder.providerPaymentId !== providerPaymentId) throw new AppError('CAD payment could not be verified.', 400)

  const paidOrder = storedOrder.status === 'paid' ? storedOrder : await markCadOrderPaid(storedOrder._id, providerPaymentId, { session })
  if (!paidOrder) throw new AppError('CAD payment could not be verified.', 400)

  await ensurePaidCadOrderEntitlement({
    userId: paidOrder.userId,
    productId: paidOrder.productId,
    orderId: paidOrder._id
  })

  return serializeCadOrder(paidOrder)
})

export const verifyPayment = async ({ userId, orderId, paymentId, signature }) => {
  requireRazorpay()
  const cadOrder = await getCadOrderByProviderOrderId(orderId)
  if (!cadOrder || !sameId(cadOrder.userId, userId) || typeof paymentId !== 'string' || !signature) throw new AppError('CAD payment could not be verified.', 400)

  const product = await CadProduct.findById(cadOrder.productId).lean()
  if (!product || cadOrder.amountInPaise !== product.salePriceInPaise || cadOrder.currency !== product.currency || !verifySignature({ orderId, paymentId, signature })) {
    await markCadOrderFailed(cadOrder._id, { code: 'verification_failed', description: 'CAD payment signature verification failed.' })
    throw new AppError('CAD payment could not be verified.', 400)
  }

  return finalizeVerifiedCadOrder({ orderId: cadOrder._id, providerPaymentId: paymentId })
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
      const order = entity?.order_id ? await getCadOrderByProviderOrderId(entity.order_id) : null
      const product = order ? await CadProduct.findById(order.productId).lean() : null
      if (order && entity.id) {
        if (!product || entity.amount !== order.amountInPaise || entity.currency !== order.currency) throw new AppError('CAD payment could not be verified.', 400)
        await finalizeVerifiedCadOrder({ orderId: order._id, providerPaymentId: entity.id })
      }
    } else if (event.event === 'payment.failed') {
      const order = entity?.order_id ? await getCadOrderByProviderOrderId(entity.order_id) : null
      if (order) await markCadOrderFailed(order._id, { code: entity.code, description: entity.description })
    }

    await markWebhookEventProcessed(claimed.event._id)
    return null
  } catch (error) {
    await markWebhookEventFailed(claimed.event._id)
    throw error
  }
}

export const getCadOrderForUser = async ({ userId, orderId }) => {
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(orderId)) return null
  const order = await getCadOrderById(orderId)
  if (!order || !sameId(order.userId, userId)) return null
  return serializeCadOrder(order)
}

export const getStudentOrders = ({ userId, page, limit }) => getStudentCadOrders({ userId, page, limit })
export const getAdminOrders = ({ page, limit }) => getAdminCadOrders({ page, limit })
