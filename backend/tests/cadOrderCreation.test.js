import test from 'node:test'
import assert from 'node:assert/strict'
import { CadOrder, serializeCadOrder } from '../src/models/CadOrder.js'
import { createCadOrderCreator } from '../src/services/cadOrderService.js'
import { markCadOrderFailed, markCadOrderPaid, markCadOrderRefunded } from '../src/repositories/cadOrderRepository.js'

const userId = '507f1f77bcf86cd799439011'
const productId = '507f191e810c19729de860ea'
const product = {
  _id: productId,
  slug: 'cad-product',
  title: 'CAD Product',
  isFree: false,
  salePriceInPaise: 1200,
  currency: 'INR'
}
const firstKey = 'intent_0000000000000001'
const secondKey = 'intent_0000000000000002'

const makeHarness = (overrides = {}) => {
  const state = {
    orders: [],
    providerOrders: [],
    reservations: [],
    providerCalls: 0,
    nextOrderId: 0
  }
  const dependencies = {
    assertRazorpayConfigured() {},
    assertReservationIndexes: async () => {},
    findProduct: async () => product,
    findByIdempotencyKey: async (ownerId, idempotencyKey) => state.orders.find((order) => String(order.userId) === String(ownerId) && order.idempotencyKey === idempotencyKey) || null,
    findReusableOrder: async (ownerId, targetProductId) => state.orders.find((order) =>
      String(order.userId) === String(ownerId) &&
      String(order.productId) === String(targetProductId) &&
      ['created', 'pending'].includes(order.status)
    ) || null,
    findActiveReservation: async (reservationKey) => state.orders.find((order) => order.reservationKey === reservationKey) || null,
    reserveOrder: async (fields) => {
      const duplicate = state.orders.some((order) =>
        (String(order.userId) === String(fields.userId) && order.idempotencyKey === fields.idempotencyKey) ||
        (typeof order.reservationKey === 'string' && order.reservationKey === fields.reservationKey)
      )
      if (duplicate) {
        const error = new Error('duplicate')
        error.code = 11000
        error.keyPattern = state.orders.some((order) =>
          String(order.userId) === String(fields.userId) && order.idempotencyKey === fields.idempotencyKey
        ) ? { userId: 1, idempotencyKey: 1 } : { reservationKey: 1 }
        throw error
      }
      const reservation = { ...fields, _id: `order-${++state.nextOrderId}` }
      state.orders.push(reservation)
      state.reservations.push({ ...fields })
      return reservation
    },
    updateProviderOrder: async (id, providerOrderId) => {
      const order = state.orders.find((entry) => entry._id === id && entry.status === 'creating')
      if (!order) return null
      order.providerOrderId = providerOrderId
      order.status = 'pending'
      return order
    },
    markReservationFailed: async (id, failureCode) => {
      const order = state.orders.find((entry) => entry._id === id)
      order.status = 'failed'
      order.failureCode = failureCode
      delete order.reservationKey
      return order
    },
    markReservationForReview: async (id) => {
      const order = state.orders.find((entry) => entry._id === id)
      order.requiresReview = true
      return order
    },
    createProviderOrder: async ({ amount, currency, receipt }) => {
      state.providerCalls += 1
      const providerOrder = { id: `provider-order-${state.providerCalls}`, amount, currency, receipt }
      state.providerOrders.push(providerOrder)
      return providerOrder
    },
    findProviderOrdersByReceipt: async (receipt) => ({
      items: state.providerOrders.filter((order) => order.receipt === receipt)
    }),
    paymentKeyId: 'test-key',
    ...overrides
  }
  return { state, dependencies, create: createCadOrderCreator(dependencies) }
}

test('unpaid order reservations omit providerPaymentId and preserve serialization compatibility', async () => {
  const { create, state } = makeHarness()
  const checkout = await create(userId, product.slug, firstKey)

  assert.equal(state.reservations.length, 1)
  assert.equal(state.reservations[0].status, 'creating')
  assert.equal(Object.hasOwn(state.reservations[0], 'providerPaymentId'), false)
  assert.equal(checkout.providerOrderId, 'provider-order-1')
  assert.equal(CadOrder.schema.path('providerPaymentId').defaultValue, undefined)
  assert.equal(CadOrder.schema.path('status').enumValues.includes('creating'), true)
  assert.equal(serializeCadOrder({ ...state.reservations[0] }).providerOrderId, null)
  assert.equal(serializeCadOrder({ providerPaymentId: undefined }).providerPaymentId, null)
  assert.equal(serializeCadOrder({ providerPaymentId: null }).providerPaymentId, null)
})

test('repeated requests with the same idempotency key return the same provider order', async () => {
  const { create, state } = makeHarness()
  const first = await create(userId, product.slug, firstKey)
  const retry = await create(userId, product.slug, firstKey)

  assert.equal(retry.providerOrderId, first.providerOrderId)
  assert.equal(state.providerCalls, 1)
  assert.equal(state.reservations.length, 1)
})

test('concurrent purchase intents claim one reservation and never create a second provider order', async () => {
  let releaseProviderOrder
  let notifyProviderStarted
  const providerStarted = new Promise((resolve) => { notifyProviderStarted = resolve })
  const providerResult = new Promise((resolve) => { releaseProviderOrder = resolve })
  const harness = makeHarness({
    createProviderOrder: async () => {
      harness.state.providerCalls += 1
      notifyProviderStarted()
      const result = await providerResult
      harness.state.providerOrders.push(result)
      return result
    }
  })

  const firstRequest = harness.create(userId, product.slug, firstKey)
  await providerStarted
  const retryCreator = createCadOrderCreator(harness.dependencies)
  const secondRequest = retryCreator(userId, product.slug, secondKey)
  await assert.rejects(secondRequest, (error) => error.code === 'CAD_ORDER_PENDING')
  assert.equal(harness.state.providerCalls, 1)

  const reservation = harness.state.reservations[0]
  releaseProviderOrder({
    id: 'provider-order-shared',
    amount: reservation.amountInPaise,
    currency: reservation.currency,
    receipt: reservation.receipt
  })
  const first = await firstRequest
  const retry = await retryCreator(userId, product.slug, secondKey)
  assert.equal(first.providerOrderId, 'provider-order-shared')
  assert.equal(retry.providerOrderId, first.providerOrderId)
  assert.equal(harness.state.providerCalls, 1)
})

test('a delayed competing insert collides after the first order becomes pending', async () => {
  let releaseProviderOrder
  let notifyProviderStarted
  const providerStarted = new Promise((resolve) => { notifyProviderStarted = resolve })
  const providerResult = new Promise((resolve) => { releaseProviderOrder = resolve })
  let releaseSecondLookup
  let notifySecondLookup
  const secondLookupGate = new Promise((resolve) => { releaseSecondLookup = resolve })
  const secondLookupReached = new Promise((resolve) => { notifySecondLookup = resolve })
  let reusableLookups = 0

  const harness = makeHarness({
    findReusableOrder: async (ownerId, targetProductId) => {
      const found = harness.state.orders.find((order) =>
        String(order.userId) === String(ownerId) &&
        String(order.productId) === String(targetProductId) &&
        ['created', 'pending'].includes(order.status)
      ) || null
      reusableLookups += 1
      if (reusableLookups === 2) {
        notifySecondLookup()
        await secondLookupGate
      }
      return found
    },
    createProviderOrder: async () => {
      harness.state.providerCalls += 1
      notifyProviderStarted()
      const order = await providerResult
      harness.state.providerOrders.push(order)
      return order
    }
  })

  const firstRequest = harness.create(userId, product.slug, firstKey)
  await providerStarted
  const secondRequest = createCadOrderCreator(harness.dependencies)(userId, product.slug, secondKey)
  await secondLookupReached

  const reservation = harness.state.reservations[0]
  releaseProviderOrder({
    id: 'provider-order-shared',
    amount: reservation.amountInPaise,
    currency: reservation.currency,
    receipt: reservation.receipt
  })
  const firstCheckout = await firstRequest
  assert.equal(harness.state.orders[0].status, 'pending')
  assert.equal(typeof harness.state.orders[0].reservationKey, 'string')

  releaseSecondLookup()
  const secondCheckout = await secondRequest

  assert.equal(secondCheckout.providerOrderId, firstCheckout.providerOrderId)
  assert.equal(harness.state.providerCalls, 1)
  assert.equal(harness.state.providerOrders.length, 1)
  assert.equal(harness.state.orders.filter((order) => ['creating', 'created', 'pending'].includes(order.status)).length, 1)
  assert.equal(harness.state.reservations.length, 1)
})

test('order creation fails closed when reservation indexes are missing', async () => {
  const { create, state } = makeHarness({
    assertReservationIndexes: async () => { throw new Error('required indexes unavailable') }
  })
  await assert.rejects(() => create(userId, product.slug, firstKey), /required indexes unavailable/)
  assert.equal(state.providerCalls, 0)
  assert.equal(state.reservations.length, 0)
})

test('legacy pending orders remain reusable without creating a new reservation', async () => {
  const existingOrder = {
    _id: 'legacy-order',
    userId,
    productId,
    status: 'pending',
    providerOrderId: 'legacy-provider-order',
    amountInPaise: 1200,
    currency: 'INR'
  }
  const { create, state } = makeHarness({
    findReusableOrder: async () => existingOrder
  })
  const checkout = await create(userId, product.slug, firstKey)
  assert.equal(checkout.providerOrderId, existingOrder.providerOrderId)
  assert.equal(state.providerCalls, 0)
  assert.equal(state.reservations.length, 0)
})

test('provider timeout leaves a reservation for receipt reconciliation without a second create', async () => {
  const harness = makeHarness({
    createProviderOrder: async () => {
      harness.state.providerCalls += 1
      throw new Error('network timeout')
    }
  })
  const originalConsoleError = console.error
  console.error = () => {}
  try {
    await assert.rejects(() => harness.create(userId, product.slug, firstKey), (error) => error.code === 'CAD_ORDER_PENDING')
    await assert.rejects(() => harness.create(userId, product.slug, firstKey), (error) => error.code === 'CAD_ORDER_PENDING')
    assert.equal(harness.state.providerCalls, 1)

    const reservation = harness.state.reservations[0]
    harness.state.providerOrders.push({
      id: 'provider-order-reconciled',
      amount: reservation.amountInPaise,
      currency: reservation.currency,
      receipt: reservation.receipt
    })
    const recovered = await harness.create(userId, product.slug, firstKey)
    assert.equal(recovered.providerOrderId, 'provider-order-reconciled')
    assert.equal(harness.state.providerCalls, 1)
  } finally {
    console.error = originalConsoleError
  }
})

test('ambiguous provider receipt matches require review and keep the reservation locked', async () => {
  const harness = makeHarness({
    createProviderOrder: async () => {
      harness.state.providerCalls += 1
      throw new Error('network timeout')
    }
  })
  const originalConsoleError = console.error
  console.error = () => {}
  try {
    await assert.rejects(() => harness.create(userId, product.slug, firstKey), (error) => error.code === 'CAD_ORDER_PENDING')
    const reservation = harness.state.reservations[0]
    const matchingProviderOrder = {
      id: 'provider-order-ambiguous',
      amount: reservation.amountInPaise,
      currency: reservation.currency,
      receipt: reservation.receipt
    }
    harness.state.providerOrders.push(matchingProviderOrder, { ...matchingProviderOrder, id: 'provider-order-second' })

    await assert.rejects(() => harness.create(userId, product.slug, firstKey), (error) => error.code === 'CAD_ORDER_REVIEW_REQUIRED')
    assert.equal(harness.state.orders[0].status, 'creating')
    assert.equal(harness.state.orders[0].requiresReview, true)
    assert.equal(harness.state.providerCalls, 1)
  } finally {
    console.error = originalConsoleError
  }
})

test('definite provider rejection releases the reservation and requires a fresh key for a new attempt', async () => {
  let providerCalls = 0
  const harness = makeHarness({
    createProviderOrder: async ({ amount, currency, receipt }) => {
      providerCalls += 1
      if (providerCalls === 1) throw { statusCode: 400, error: { code: 'BAD_REQUEST_ERROR' } }
      const providerOrder = { id: 'provider-order-after-retry', amount, currency, receipt }
      harness.state.providerOrders.push(providerOrder)
      return providerOrder
    }
  })
  const originalConsoleError = console.error
  console.error = () => {}
  try {
    await assert.rejects(() => harness.create(userId, product.slug, firstKey), (error) => error.code === 'CAD_ORDER_RETRY_REQUIRED')
    await assert.rejects(() => harness.create(userId, product.slug, firstKey), (error) => error.code === 'CAD_ORDER_RETRY_REQUIRED')
    const checkout = await harness.create(userId, product.slug, secondKey)
    assert.equal(checkout.providerOrderId, 'provider-order-after-retry')
    assert.equal(providerCalls, 2)
    assert.equal(harness.state.orders[0].status, 'failed')
  } finally {
    console.error = originalConsoleError
  }
})

test('a paid order permits a separate legitimate future purchase with a new key', async () => {
  const { create, state } = makeHarness()
  const first = await create(userId, product.slug, firstKey)
  const firstOrder = state.orders[0]
  firstOrder.status = 'paid'
  firstOrder.providerPaymentId = 'payment-reference'
  delete firstOrder.reservationKey

  const second = await create(userId, product.slug, secondKey)
  assert.equal(first.providerOrderId, 'provider-order-1')
  assert.equal(second.providerOrderId, 'provider-order-2')
  assert.equal(state.reservations.length, 2)
  assert.equal(state.providerCalls, 2)
})

test('duplicate-key recovery reuses only an order matching the authenticated user and product', async () => {
  const validOrder = {
    _id: 'existing',
    userId,
    productId,
    status: 'pending',
    providerOrderId: 'existing-provider-order',
    amountInPaise: 1200,
    currency: 'INR'
  }
  const valid = makeHarness({
    reserveOrder: async () => {
      const error = new Error('duplicate')
      error.code = 11000
      error.keyPattern = { reservationKey: 1 }
      throw error
    },
    findReusableOrder: async () => validOrder
  })
  const checkout = await valid.create(userId, product.slug, firstKey)
  assert.equal(checkout.providerOrderId, validOrder.providerOrderId)
  assert.equal(valid.state.providerCalls, 0)

  const invalid = makeHarness({
    reserveOrder: async () => {
      const error = new Error('duplicate')
      error.code = 11000
      error.keyPattern = { reservationKey: 1 }
      throw error
    },
    findReusableOrder: async () => ({ ...validOrder, productId: '507f191e810c19729de860ef' })
  })
  await assert.rejects(() => invalid.create(userId, product.slug, firstKey), (error) => error.code === 11000)
})

test('unknown duplicate-key indexes are not treated as reservation conflicts', async () => {
  const duplicateError = new Error('duplicate')
  duplicateError.code = 11000
  duplicateError.keyPattern = { providerPaymentId: 1 }
  let reusableLookups = 0
  const harness = makeHarness({
    reserveOrder: async () => { throw duplicateError },
    findReusableOrder: async () => {
      reusableLookups += 1
      return reusableLookups === 1 ? null : {
        _id: 'pending-order',
        userId,
        productId,
        status: 'pending',
        providerOrderId: 'existing-provider-order',
        amountInPaise: 1200,
        currency: 'INR'
      }
    }
  })
  await assert.rejects(() => harness.create(userId, product.slug, firstKey), (error) => error === duplicateError)
  assert.equal(harness.state.providerCalls, 0)
})

test('successful payment callback writes the provider payment ID to the existing unpaid order', async () => {
  const originalFindOneAndUpdate = CadOrder.findOneAndUpdate
  let capturedUpdate
  CadOrder.findOneAndUpdate = (_filter, update) => {
    capturedUpdate = update
    return { lean: async () => ({ _id: 'order-id', status: 'paid', providerPaymentId: 'payment-id' }) }
  }
  try {
    const paidOrder = await markCadOrderPaid('order-id', 'payment-id')
    assert.equal(paidOrder.providerPaymentId, 'payment-id')
    assert.equal(capturedUpdate.$set.providerPaymentId, 'payment-id')
    assert.equal(capturedUpdate.$unset.reservationKey, 1)
  } finally {
    CadOrder.findOneAndUpdate = originalFindOneAndUpdate
  }
})

test('paid, failed, and refunded order transitions release the active-order key', async () => {
  const originalFindOneAndUpdate = CadOrder.findOneAndUpdate
  const updates = []
  CadOrder.findOneAndUpdate = (_filter, update) => {
    updates.push(update)
    return { lean: async () => ({}) }
  }
  try {
    await markCadOrderPaid('order-id', 'payment-id')
    await markCadOrderFailed('order-id')
    await markCadOrderRefunded('order-id')

    assert.equal(updates.length, 3)
    assert.equal(updates.every((update) => update.$unset.reservationKey === 1), true)
    assert.deepEqual(updates.map((update) => update.$set.status), ['paid', 'failed', 'refunded'])
  } finally {
    CadOrder.findOneAndUpdate = originalFindOneAndUpdate
  }
})
