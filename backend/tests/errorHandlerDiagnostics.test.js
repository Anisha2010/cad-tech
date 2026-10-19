import test from 'node:test'
import assert from 'node:assert/strict'
import { errorHandlerMiddleware } from '../src/middleware/errorHandler.js'

test('returns a sanitized 409 and logs only the route template and safe category', () => {
  const response = {
    statusCode: null,
    payload: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this }
  }
  const logCalls = []
  const originalConsoleError = console.error
  console.error = (...args) => logCalls.push(args)

  try {
    errorHandlerMiddleware({
      code: 11000,
      keyPattern: { providerOrderId: 1 },
      keyValue: { providerOrderId: 'secret-provider-order' },
      message: 'E11000 duplicate key error collection: cadtech.cadorders index: providerOrderId_1 dup key: { providerOrderId: "secret-provider-order" }'
    }, {
      method: 'POST',
      route: { path: '/admin/cad-products/:productId/secure-file' }
    }, response, () => {})
  } finally {
    console.error = originalConsoleError
  }

  assert.equal(response.statusCode, 409)
  assert.deepEqual(response.payload, {
    success: false,
    message: 'This payment has already been recorded.'
  })
  assert.deepEqual(logCalls, [[
    '[Request error]',
    {
      statusCode: 409,
      method: 'POST',
      route: '/admin/cad-products/:productId/secure-file',
      category: 'DUPLICATE_KEY',
      errorName: 'Error',
      errorCode: 11000,
      duplicateKeyFields: ['providerOrderId'],
      duplicateKeyIndex: 'providerOrderId_1'
    }
  ]])
  assert.doesNotMatch(JSON.stringify(logCalls), /secret-provider-order|cadtech|E11000|dup key/)
  assert.doesNotMatch(JSON.stringify(response.payload), /secret-provider-order|providerOrderId/)
})

test('does not log malformed index names or unsafe key-pattern field names', () => {
  const response = {
    statusCode: null,
    payload: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this }
  }
  const logCalls = []
  const originalConsoleError = console.error
  console.error = (...args) => logCalls.push(args)

  try {
    errorHandlerMiddleware({
      code: 11000,
      keyPattern: { 'customer.email': 1, 'secret value': 1 },
      indexName: 'private index name'
    }, {
      method: 'POST',
      route: { path: '/orders' }
    }, response, () => {})
  } finally {
    console.error = originalConsoleError
  }

  assert.deepEqual(logCalls[0][1].duplicateKeyFields, ['customer.email'])
  assert.equal(Object.hasOwn(logCalls[0][1], 'duplicateKeyIndex'), false)
})

test('does not mislabel unknown duplicate-key indexes as account email conflicts', () => {
  const response = {
    statusCode: null,
    payload: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this }
  }
  const logCalls = []
  const originalConsoleError = console.error
  console.error = (...args) => logCalls.push(args)

  try {
    errorHandlerMiddleware({
      code: 11000,
      keyPattern: { reservationKey: 1 },
      keyValue: { reservationKey: 'private-reservation-key' }
    }, {
      method: 'POST',
      route: { path: '/cad-payments/orders' }
    }, response, () => {})
  } finally {
    console.error = originalConsoleError
  }

  assert.equal(response.statusCode, 409)
  assert.deepEqual(response.payload, {
    success: false,
    message: 'A conflicting record already exists.'
  })
  assert.deepEqual(logCalls[0][1].duplicateKeyFields, ['reservationKey'])
  assert.doesNotMatch(JSON.stringify(logCalls), /private-reservation-key/)
})

test('logs an unhandled database error by safe type/code and returns no raw details', () => {
  const response = {
    statusCode: null,
    payload: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this }
  }
  const logCalls = []
  const originalConsoleError = console.error
  console.error = (...args) => logCalls.push(args)

  try {
    errorHandlerMiddleware({
      name: 'MongoNetworkError',
      code: 6,
      message: 'mongodb+srv://user:password@cluster/private'
    }, {
      method: 'POST',
      route: { path: '/admin/cad-products/:productId/secure-file' }
    }, response, () => {})
  } finally {
    console.error = originalConsoleError
  }

  assert.equal(response.statusCode, 500)
  assert.deepEqual(response.payload, {
    success: false,
    message: 'An internal server error occurred.'
  })
  assert.deepEqual(logCalls, [[
    '[Request error]',
    {
      statusCode: 500,
      method: 'POST',
      route: '/admin/cad-products/:productId/secure-file',
      category: 'UNHANDLED_ERROR',
      errorName: 'MongoNetworkError',
      errorCode: 6
    }
  ]])
  assert.doesNotMatch(JSON.stringify(logCalls), /mongodb|password|cluster|private/)
  assert.doesNotMatch(JSON.stringify(response.payload), /mongodb|password|cluster|private/)
})
