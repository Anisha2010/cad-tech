import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import * as paymentService from '../src/services/paymentService.js'
import { getRazorpayConfigStatus, razorpay } from '../src/config/razorpay.js'
import { Enrollment } from '../src/models/Enrollment.js'
import { Payment } from '../src/models/Payment.js'

const validUserId = '507f1f77bcf86cd799439011'
const validCourse = {
  id: '507f1f77bcf86cd799439012',
  slug: 'cad-essentials',
  status: 'published',
  enrollmentOpen: true,
  priceInPaise: 29900,
  currency: 'INR',
  title: 'CAD Essentials'
}

test('missing Razorpay configuration is reported without exposing secret values', () => {
  const status = getRazorpayConfigStatus({
    razorpay_key_id: '',
    razorpay_key_secret: '',
    razorpay_webhook_secret: ''
  })

  assert.equal(status.configured, false)
  assert.equal(status.keyIdPresent, false)
  assert.equal(status.keySecretPresent, false)
  assert.equal(status.webhookSecretPresent, false)
  assert.equal(status.keyIdTestMode, false)
})

test('invalid course identifier is rejected before creating an order', async () => {
  await assert.rejects(
    () => paymentService.createOrder('not-a-valid-id', 'cad-essentials'),
    (error) => {
      assert.equal(error.statusCode, 400)
      assert.match(error.message, /valid course/i)
      return true
    }
  )
})

test('unpublished or unavailable course is rejected with a safe validation error', async () => {
  const handler = paymentService.createOrderService({
    getCourseBySlug: async () => ({ ...validCourse, status: 'draft', enrollmentOpen: true }),
    getActiveEnrollment: async () => null,
    getReusablePendingPayment: async () => null,
    createPayment: async () => ({ providerOrderId: 'order_123', amountInPaise: validCourse.priceInPaise, currency: validCourse.currency }),
    updatePaymentProviderOrder: async (_id, providerOrderId) => ({ providerOrderId, amountInPaise: validCourse.priceInPaise, currency: validCourse.currency }),
    razorpayClient: { orders: { create: async () => ({ id: 'order_123' }) } },
    paymentKeyId: 'rzp_test_key'
  })

  await assert.rejects(
    () => handler(validUserId, validCourse.slug),
    (error) => {
      assert.equal(error.statusCode, 400)
      assert.match(error.message, /not currently available/i)
      return true
    }
  )
})

test('invalid backend course price is rejected before contacting Razorpay', async () => {
  const handler = paymentService.createOrderService({
    getCourseBySlug: async () => ({ ...validCourse, priceInPaise: 0, enrollmentOpen: true, status: 'published' }),
    getActiveEnrollment: async () => null,
    getReusablePendingPayment: async () => null,
    createPayment: async () => ({ providerOrderId: 'order_123', amountInPaise: validCourse.priceInPaise, currency: validCourse.currency }),
    updatePaymentProviderOrder: async (_id, providerOrderId) => ({ providerOrderId, amountInPaise: validCourse.priceInPaise, currency: validCourse.currency }),
    razorpayClient: { orders: { create: async () => ({ id: 'order_123' }) } },
    paymentKeyId: 'rzp_test_key'
  })

  await assert.rejects(
    () => handler(validUserId, validCourse.slug),
    (error) => {
      assert.equal(error.statusCode, 422)
      assert.match(error.message, /priced for enrollment/i)
      return true
    }
  )
})

test('already enrolled student is rejected with 409', async () => {
  let providerOrderCalls = 0
  const handler = paymentService.createOrderService({
    getCourseBySlug: async () => validCourse,
    getActiveEnrollment: async () => ({ id: 'enrollment_123' }),
    getReusablePendingPayment: async () => null,
    createPayment: async () => ({ providerOrderId: 'order_123', amountInPaise: validCourse.priceInPaise, currency: validCourse.currency }),
    razorpayClient: { orders: { create: async () => { providerOrderCalls += 1; return { id: 'order_123' } } } },
    paymentKeyId: 'rzp_test_key'
  })

  await assert.rejects(
    () => handler(validUserId, validCourse.slug),
    (error) => {
      assert.equal(error.statusCode, 409)
      assert.match(error.message, /already enrolled/i)
      return true
    }
  )
  assert.equal(providerOrderCalls, 0)
})

test('concurrent checkout requests for one student and course share one Razorpay order', async () => {
  let providerOrderCalls = 0
  let createPaymentCalls = 0
  let releaseProviderOrder
  const providerOrder = new Promise((resolve) => { releaseProviderOrder = resolve })
  const handler = paymentService.createOrderService({
    getCourseBySlug: async () => validCourse,
    getActiveEnrollment: async () => null,
    getReusablePendingPayment: async () => null,
    createPayment: async (fields) => {
      createPaymentCalls += 1
      return { _id: 'payment_123', providerOrderId: fields.providerOrderId, amountInPaise: fields.amountInPaise, currency: fields.currency }
    },
    updatePaymentProviderOrder: async (_id, providerOrderId) => ({ providerOrderId, amountInPaise: validCourse.priceInPaise, currency: validCourse.currency }),
    razorpayClient: { orders: { create: async () => { providerOrderCalls += 1; return providerOrder } } },
    paymentKeyId: 'rzp_test_key'
  })

  const first = handler(validUserId, validCourse.slug)
  const second = handler(validUserId, validCourse.slug)
  await new Promise((resolve) => setImmediate(resolve))
  releaseProviderOrder({ id: 'order_shared' })
  const [firstResult, secondResult] = await Promise.all([first, second])

  assert.equal(firstResult.providerOrderId, 'order_shared')
  assert.equal(secondResult.providerOrderId, 'order_shared')
  assert.equal(providerOrderCalls, 1)
  assert.equal(createPaymentCalls, 1)
})

test('successful Razorpay Test Mode order creation returns safe checkout data', async () => {
  const handler = paymentService.createOrderService({
    getCourseBySlug: async () => validCourse,
    getActiveEnrollment: async () => null,
    getReusablePendingPayment: async () => null,
    createPayment: async (fields) => ({
      _id: 'payment_123',
      providerOrderId: fields.providerOrderId,
      amountInPaise: fields.amountInPaise,
      currency: fields.currency
    }),
    updatePaymentProviderOrder: async (_id, providerOrderId) => ({ providerOrderId, amountInPaise: validCourse.priceInPaise, currency: validCourse.currency }),
    razorpayClient: { orders: { create: async () => ({ id: 'order_123' }) } },
    paymentKeyId: 'rzp_test_key'
  })

  const response = await handler(validUserId, validCourse.slug)

  assert.equal(response.providerOrderId, 'order_123')
  assert.equal(response.amount, validCourse.priceInPaise)
  assert.equal(response.currency, validCourse.currency)
  assert.equal(response.courseSlug, validCourse.slug)
})

test('Razorpay provider failure is surfaced as a safe 503 without exposing internal error details', async () => {
  const handler = paymentService.createOrderService({
    getCourseBySlug: async () => validCourse,
    getActiveEnrollment: async () => null,
    getReusablePendingPayment: async () => null,
    createPayment: async (fields) => ({
    _id: 'payment_123',
    providerOrderId: fields.providerOrderId,
    amountInPaise: fields.amountInPaise,
    currency: fields.currency
    }),
    markPaymentFailed: async () => null,
    razorpayClient: { orders: { create: async () => {
      const error = new Error('Razorpay rejected the request')
      error.error = { code: 'BAD_REQUEST_ERROR', description: 'The Razorpay key pair is invalid.' }
      throw error
    } } },
    paymentKeyId: 'rzp_test_key'
  })

  await assert.rejects(
    () => handler(validUserId, validCourse.slug),
    (error) => {
      assert.equal(error.statusCode, 503)
      assert.equal(error.code, 'PAYMENT_PROVIDER_UNAVAILABLE')
      assert.equal(error.message, 'Payment service is temporarily unavailable.')
      return true
    }
  )
})

test('payment status only completes enrollment after Razorpay reports a matching captured payment', async () => {
  let finalized = 0
  const payment = { _id: 'payment_123', userId: validUserId, courseId: validCourse.id, providerOrderId: 'order_123', amountInPaise: 29900, currency: 'INR', status: 'pending' }
  const handler = paymentService.createPaymentStatusService({
    getCourseBySlug: async () => validCourse,
    getActiveEnrollment: async () => null,
    getPaymentByProviderOrderId: async () => payment,
    getReusablePendingPayment: async () => payment,
    finalizePayment: async () => { finalized += 1; return { _id: 'enrollment_123', progressPercentage: 0 } },
    razorpayClient: { orders: { fetchPayments: async () => ({ items: [{ id: 'pay_123', order_id: 'order_123', amount: 29900, currency: 'INR', status: 'captured' }] }) } }
  })

  const result = await handler({ userId: validUserId, courseSlug: validCourse.slug, orderId: 'order_123' })

  assert.equal(result.status, 'enrolled')
  assert.equal(result.enrollment._id, 'enrollment_123')
  assert.equal(finalized, 1)
})

test('unresolved Razorpay status remains pending and does not create enrollment', async () => {
  let finalized = 0
  const payment = { _id: 'payment_123', userId: validUserId, courseId: validCourse.id, providerOrderId: 'order_123', amountInPaise: 29900, currency: 'INR', status: 'pending' }
  const handler = paymentService.createPaymentStatusService({
    getCourseBySlug: async () => validCourse,
    getActiveEnrollment: async () => null,
    getPaymentByProviderOrderId: async () => payment,
    getReusablePendingPayment: async () => payment,
    finalizePayment: async () => { finalized += 1 },
    razorpayClient: { orders: { fetchPayments: async () => ({ items: [] }) } }
  })

  const result = await handler({ userId: validUserId, courseSlug: validCourse.slug, orderId: 'order_123' })

  assert.equal(result.status, 'pending')
  assert.equal(finalized, 0)
})

test('failed provider payment allows retry without enrollment', async () => {
  const payment = { _id: 'payment_123', userId: validUserId, courseId: validCourse.id, providerOrderId: 'order_123', amountInPaise: 29900, currency: 'INR', status: 'pending' }
  let markedFailed = false
  const handler = paymentService.createPaymentStatusService({
    getCourseBySlug: async () => validCourse,
    getActiveEnrollment: async () => null,
    getPaymentByProviderOrderId: async () => payment,
    getReusablePendingPayment: async () => payment,
    markPaymentFailed: async () => { markedFailed = true },
    razorpayClient: { orders: { fetchPayments: async () => ({ items: [{ status: 'failed' }] }) } }
  })

  const result = await handler({ userId: validUserId, courseSlug: validCourse.slug, orderId: 'order_123' })

  assert.equal(result.status, 'failed')
  assert.equal(result.enrollment, null)
  assert.equal(markedFailed, true)
})

test('a failed attempt webhook does not terminalize an order before provider reconciliation', async () => {
  const webhookSecret = 'test-webhook-secret'
  const rawBody = Buffer.from(JSON.stringify({
    id: 'event_failed_attempt',
    event: 'payment.failed',
    payload: { payment: { entity: { id: 'pay_failed', order_id: 'order_123' } } }
  }))
  const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')
  let markFailedCalls = 0
  const reconcile = paymentService.createWebhookReconciler({
    webhookSecret,
    claimWebhookEvent: async () => ({ claimed: true, event: { _id: 'event_record_123' } }),
    markWebhookEventProcessed: async () => null,
    markWebhookEventFailed: async () => null,
    markPaymentFailed: async () => { markFailedCalls += 1 }
  })

  await reconcile(rawBody, signature)

  assert.equal(markFailedCalls, 0)
})

test('captured payment can reconcile after a prior failed attempt', async () => {
  const payment = { _id: 'payment_123', userId: validUserId, courseId: validCourse.id, providerOrderId: 'order_123', amountInPaise: 29900, currency: 'INR', status: 'failed' }
  let finalized = 0
  const handler = paymentService.createPaymentStatusService({
    getCourseBySlug: async () => validCourse,
    getActiveEnrollment: async () => null,
    getPaymentByProviderOrderId: async () => payment,
    getReusablePendingPayment: async () => payment,
    finalizePayment: async () => { finalized += 1; return { _id: 'enrollment_123' } },
    razorpayClient: { orders: { fetchPayments: async () => ({ items: [{ id: 'pay_captured', order_id: 'order_123', amount: 29900, currency: 'INR', status: 'captured' }] }) } }
  })

  const result = await handler({ userId: validUserId, courseSlug: validCourse.slug, orderId: 'order_123' })

  assert.equal(result.status, 'enrolled')
  assert.equal(finalized, 1)
})

test('repeated verified payment finalization reuses one enrollment record', async () => {
  let payment = { _id: 'payment_123', userId: validUserId, courseId: validCourse.id, status: 'pending', providerPaymentId: null }
  let enrollment = null
  let insertedEnrollments = 0
  const finalize = paymentService.createFinalizeVerifiedPaymentService({
    runTransaction: (operation) => operation(null),
    getPaymentById: async () => payment,
    markPaymentPaid: async (_id, providerPaymentId) => {
      payment = { ...payment, status: 'paid', providerPaymentId }
      return payment
    },
    createEnrollment: async (fields) => {
      if (!enrollment) {
        insertedEnrollments += 1
        enrollment = { _id: 'enrollment_123', ...fields }
      }
      return enrollment
    },
    attachEnrollment: async () => null
  })

  const first = await finalize({ paymentId: payment._id, providerPaymentId: 'pay_123' })
  const second = await finalize({ paymentId: payment._id, providerPaymentId: 'pay_123' })

  assert.equal(first._id, 'enrollment_123')
  assert.equal(second._id, 'enrollment_123')
  assert.equal(insertedEnrollments, 1)
})

test('simultaneous identical verification requests converge on one paid result', async () => {
  let payment = { _id: 'payment_123', userId: validUserId, courseId: validCourse.id, status: 'pending', providerPaymentId: null }
  let enrollment = null
  let insertCount = 0
  let reads = 0
  let releaseReads
  const readsReady = new Promise((resolve) => { releaseReads = resolve })
  const finalize = paymentService.createFinalizeVerifiedPaymentService({
    runTransaction: (operation) => operation(null),
    getPaymentById: async () => {
      reads += 1
      if (reads === 2) releaseReads()
      if (reads <= 2) await readsReady
      return payment
    },
    markPaymentPaid: async (_id, providerPaymentId) => {
      if (payment.status === 'paid') return null
      payment = { ...payment, status: 'paid', providerPaymentId }
      return payment
    },
    createEnrollment: async (fields) => {
      if (!enrollment) {
        insertCount += 1
        enrollment = { _id: 'enrollment_123', ...fields }
      }
      return enrollment
    },
    attachEnrollment: async () => null
  })

  const results = await Promise.all([
    finalize({ paymentId: payment._id, providerPaymentId: 'pay_123' }),
    finalize({ paymentId: payment._id, providerPaymentId: 'pay_123' })
  ])

  assert.deepEqual(results.map((result) => result._id), ['enrollment_123', 'enrollment_123'])
  assert.equal(insertCount, 1)
})

test('duplicate signed webhook delivery finalizes payment only once', async () => {
  const webhookSecret = 'test-webhook-secret'
  const event = {
    id: 'event_test_123',
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_123', order_id: 'order_123', amount: 29900, currency: 'INR' } } }
  }
  const rawBody = Buffer.from(JSON.stringify(event))
  const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')
  const payment = { _id: 'payment_123', courseId: validCourse.id, providerOrderId: 'order_123', amountInPaise: 29900, currency: 'INR' }
  let alreadyClaimed = false
  let finalized = 0
  const reconcile = paymentService.createWebhookReconciler({
    webhookSecret,
    claimWebhookEvent: async () => {
      if (alreadyClaimed) return { claimed: false, event: { _id: 'event_record_123' } }
      alreadyClaimed = true
      return { claimed: true, event: { _id: 'event_record_123' } }
    },
    markWebhookEventProcessed: async () => null,
    markWebhookEventFailed: async () => null,
    getPaymentByProviderOrderId: async () => payment,
    getCourseById: async () => validCourse,
    finalizePayment: async () => { finalized += 1; return { _id: 'enrollment_123' } }
  })

  await reconcile(rawBody, signature)
  await reconcile(rawBody, signature)

  assert.equal(finalized, 1)
})

test('enrollment schema declares unique student and course protection', () => {
  const uniqueEnrollmentIndex = Enrollment.schema.indexes().find(([fields, options]) => fields.userId === 1 && fields.courseId === 1 && options.unique)
  assert.ok(uniqueEnrollmentIndex)
})

test('payment schema reserves one concurrent order creation per student and course', () => {
  const orderReservationIndex = Payment.schema.indexes().find(([fields, options]) => fields.userId === 1 && fields.courseId === 1 && options.unique && options.partialFilterExpression?.status === 'creating')
  assert.ok(orderReservationIndex)
})
