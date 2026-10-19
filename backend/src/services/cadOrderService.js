import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { CadOrder, serializeCadOrder } from '../models/CadOrder.js'
import { CadProduct } from '../models/CadProduct.js'
import { createCadOrder as createCadOrderRecord, getCadOrderById, getCadOrderByIdempotencyKey, getCadOrderByProviderOrderId, getCadOrderByReservationKey, getReusablePendingCadOrder, getStudentCadOrders, getAdminCadOrders, markCadOrderFailed, markCadOrderPaid, markCadOrderReservationFailed, markCadOrderReservationForReview, updateCadOrderProviderOrder } from '../repositories/cadOrderRepository.js'
import { claimWebhookEvent, markWebhookEventFailed, markWebhookEventProcessed } from '../repositories/webhookEventRepository.js'
import { ensurePaidCadOrderEntitlement } from './cadDownloadEntitlementService.js'
import { razorpay, razorpayConfigured, razorpayKeyId, razorpayWebhookSecret } from '../config/razorpay.js'
import { verifyCadOrderReservationIndexes } from '../utils/cadOrderReservationIndexes.js'

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
const validIdempotencyKey = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(value)
const reservationKeyFor = (userId, productId) => crypto.createHash('sha256').update(`${userId}:${productId}`).digest('hex')
const isTransactionUnsupported = (error) => /transaction numbers are only allowed|replica set|transaction is not supported|transactions are not supported/i.test(error?.message || '')
const duplicateIndexNames = {
  idempotency: 'cadorder_user_idempotency_unique',
  reservation: 'cadorder_active_order_unique',
  providerOrder: 'providerOrderId_1'
}
const duplicateIndexName = (error) => {
  if (typeof error?.indexName === 'string') return error.indexName
  if (typeof error?.index === 'string') return error.index
  return typeof error?.message === 'string'
    ? error.message.match(/\bindex:\s*([A-Za-z0-9_.$-]{1,127})\s+dup key:/)?.[1]
    : null
}
const isDuplicateFor = (error, fields, indexName) => {
  if (error?.code !== 11000) return false
  const keyPatternFields = error?.keyPattern && typeof error.keyPattern === 'object'
    ? Object.keys(error.keyPattern).sort()
    : []
  if (keyPatternFields.length) {
    const expectedFields = [...fields].sort()
    return keyPatternFields.length === expectedFields.length &&
      expectedFields.every((field, index) => keyPatternFields[index] === field)
  }
  return duplicateIndexName(error) === indexName
}
const isReservationInsertConflict = (error) =>
  isDuplicateFor(error, ['userId', 'idempotencyKey'], duplicateIndexNames.idempotency) ||
  isDuplicateFor(error, ['reservationKey'], duplicateIndexNames.reservation)
let reservationIndexesPromise
const assertCadOrderReservationIndexes = () => {
  if (!reservationIndexesPromise) {
    reservationIndexesPromise = verifyCadOrderReservationIndexes(CadOrder.collection).catch((error) => {
      reservationIndexesPromise = null
      throw error
    })
  }
  return reservationIndexesPromise
}

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

export const createCadOrderCreator = ({
  assertRazorpayConfigured = requireRazorpay,
  isValidObjectId = mongoose.isValidObjectId,
  assertReservationIndexes = assertCadOrderReservationIndexes,
  findProduct = (slug) => CadProduct.findOne({ slug, status: 'published' }).lean(),
  findReusableOrder = getReusablePendingCadOrder,
  findByIdempotencyKey = getCadOrderByIdempotencyKey,
  findActiveReservation = getCadOrderByReservationKey,
  reserveOrder = createCadOrderRecord,
  updateProviderOrder = updateCadOrderProviderOrder,
  markReservationFailed = markCadOrderReservationFailed,
  markReservationForReview = markCadOrderReservationForReview,
  createProviderOrder = (fields) => razorpay.orders.create(fields),
  findProviderOrdersByReceipt = (receipt) => razorpay.orders.all({ receipt, count: 10 }),
  paymentKeyId = razorpayKeyId
} = {}) => async (userId, productSlug, idempotencyKey) => {
  assertRazorpayConfigured()
  if (!isValidObjectId(userId) || typeof productSlug !== 'string' || !productSlug.trim()) throw new AppError('A valid CAD product is required.', 400)
  if (!validIdempotencyKey(idempotencyKey)) throw new AppError('A valid order idempotency key is required.', 400, null, 'CAD_ORDER_IDEMPOTENCY_KEY_REQUIRED')
  await assertReservationIndexes()

  const product = await findProduct(productSlug.trim().toLowerCase())
  if (!product) throw new AppError('CAD product not found.', 404)
  if (product.isFree || !validPrice(product.salePriceInPaise) || product.currency !== 'INR') throw new AppError('This CAD product is not available for purchase.', 400)

  const buildCheckout = (order) => ({
    keyId: paymentKeyId,
    providerOrderId: order.providerOrderId,
    amount: order.amountInPaise,
    currency: order.currency,
    productSlug: product.slug,
    productTitle: product.title
  })
  const isMatchingOrder = (order) => order &&
    sameId(order.userId, userId) &&
    sameId(order.productId, product._id)
  const checkoutable = (order) => isMatchingOrder(order) &&
    ['created', 'pending'].includes(order.status) &&
    typeof order.providerOrderId === 'string' &&
    order.providerOrderId.length > 0

  const createInProgressError = () => new AppError('CAD checkout is still being prepared. Retry with the same idempotency key shortly.', 503, null, 'CAD_ORDER_PENDING')
  const reviewRequiredError = () => new AppError('CAD checkout requires reconciliation before another order can be created.', 503, null, 'CAD_ORDER_REVIEW_REQUIRED')
  const retryRequiredError = () => new AppError('This checkout attempt ended. Start a new checkout attempt.', 409, null, 'CAD_ORDER_RETRY_REQUIRED')

  const checkoutOrError = async (reservation) => {
    if (!isMatchingOrder(reservation)) throw new AppError('The idempotency key is already associated with a different purchase.', 409, null, 'CAD_ORDER_IDEMPOTENCY_KEY_REUSED')
    if (checkoutable(reservation)) return buildCheckout(reservation)
    if (reservation.status === 'failed') throw retryRequiredError()
    if (['paid', 'refunded'].includes(reservation.status)) throw new AppError('This CAD order has already been completed.', 409, null, 'CAD_ORDER_ALREADY_COMPLETED')
    if (reservation.status !== 'creating' || reservation.requiresReview) throw reviewRequiredError()

    let providerOrders
    try {
      providerOrders = await findProviderOrdersByReceipt(reservation.receipt)
    } catch {
      throw createInProgressError()
    }
    const receiptMatches = Array.isArray(providerOrders?.items)
      ? providerOrders.items.filter((candidate) => candidate?.receipt === reservation.receipt)
      : []

    if (receiptMatches.length === 0) throw createInProgressError()
    if (receiptMatches.length !== 1) {
      await markReservationForReview(reservation._id)
      throw reviewRequiredError()
    }

    const providerMatch = receiptMatches[0]
    if (
      providerMatch?.amount !== reservation.amountInPaise ||
      providerMatch?.currency !== reservation.currency ||
      typeof providerMatch?.id !== 'string' ||
      !providerMatch.id
    ) {
      await markReservationForReview(reservation._id)
      throw reviewRequiredError()
    }

    let reconciled
    try {
      reconciled = await updateProviderOrder(reservation._id, providerMatch.id)
    } catch (error) {
      if (!isDuplicateFor(error, ['providerOrderId'], duplicateIndexNames.providerOrder)) throw error
      await markReservationForReview(reservation._id)
      throw reviewRequiredError()
    }
    if (checkoutable(reconciled)) return buildCheckout(reconciled)
    const current = await findByIdempotencyKey(userId, idempotencyKey)
    if (checkoutable(current)) return buildCheckout(current)
    throw createInProgressError()
  }

  const existingByKey = await findByIdempotencyKey(userId, idempotencyKey)
  if (existingByKey) return checkoutOrError(existingByKey)

  const pending = await findReusableOrder(userId, product._id)
  if (checkoutable(pending)) return buildCheckout(pending)

  const reservationKey = reservationKeyFor(userId, product._id)
  const receipt = `cad_${crypto.randomUUID().replaceAll('-', '')}`
  const reservationFields = {
    userId,
    productId: product._id,
    productSnapshot: {
      title: product.title,
      slug: product.slug,
      categoryId: product.categoryId || null,
      imageUrl: Array.isArray(product.previewImages) && product.previewImages[0]?.url ? product.previewImages[0].url : null
    },
    provider: 'razorpay',
    providerOrderId: `reservation_${crypto.randomUUID()}`,
    idempotencyKey,
    reservationKey,
    receipt,
    amountInPaise: product.salePriceInPaise,
    currency: product.currency,
    status: 'creating',
    requiresReview: false
  }

  let reservation
  try {
    reservation = await reserveOrder(reservationFields)
  } catch (error) {
    if (!isReservationInsertConflict(error)) throw error
    const byKey = await findByIdempotencyKey(userId, idempotencyKey)
    if (byKey) return checkoutOrError(byKey)
    const active = await findActiveReservation(reservationKey)
    if (active && isMatchingOrder(active)) return checkoutOrError(active)
    const reusable = await findReusableOrder(userId, product._id)
    if (checkoutable(reusable)) return buildCheckout(reusable)
    throw error
  }

  let providerOrder
  try {
    providerOrder = await createProviderOrder({
      amount: product.salePriceInPaise,
      currency: product.currency,
      receipt
    })
  } catch (error) {
    const providerStatus = Number(error?.statusCode || error?.response?.status)
    const definitelyRejected = providerStatus >= 400 && providerStatus < 500 && ![408, 409, 425, 429].includes(providerStatus)
    console.error('[Razorpay] CAD order creation failed.', {
      errorName: /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error?.name || '') ? error.name : 'Error',
      statusCode: Number.isInteger(providerStatus) ? providerStatus : undefined,
      outcome: definitelyRejected ? 'REJECTED' : 'UNKNOWN'
    })
    if (definitelyRejected) {
      await markReservationFailed(reservation._id, 'provider_rejected')
      throw retryRequiredError()
    }
    throw createInProgressError()
  }

  if (typeof providerOrder?.id !== 'string' || !providerOrder.id) {
    await markReservationForReview(reservation._id)
    throw reviewRequiredError()
  }

  let readyOrder
  try {
    readyOrder = await updateProviderOrder(reservation._id, providerOrder.id)
  } catch (error) {
    if (!isDuplicateFor(error, ['providerOrderId'], duplicateIndexNames.providerOrder)) throw error
    await markReservationForReview(reservation._id)
    throw reviewRequiredError()
  }
  if (!checkoutable(readyOrder)) {
    const current = await findByIdempotencyKey(userId, idempotencyKey)
    if (checkoutable(current)) return buildCheckout(current)
    throw createInProgressError()
  }

  return buildCheckout(readyOrder)
}

export const createOrder = createCadOrderCreator()

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
