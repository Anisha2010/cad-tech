import test from 'node:test'
import assert from 'node:assert/strict'
import { getSafeMongoErrorDetails } from '../src/utils/safeMongoErrorDetails.js'

test('keeps MongoDB error names and numeric codes without connection strings or messages', () => {
  assert.deepEqual(getSafeMongoErrorDetails({
    name: 'MongoNetworkError',
    code: 91,
    message: 'mongodb+srv://user:password@cluster.example/db'
  }), {
    errorName: 'MongoNetworkError',
    errorCode: 91
  })
})

test('uses a safe fallback for invalid MongoDB error names and non-numeric codes', () => {
  assert.deepEqual(getSafeMongoErrorDetails({
    name: 'Bad Error? mongodb://secret',
    code: 'ECONNRESET',
    message: 'credentials and connection details'
  }), { errorName: 'MongoError' })
})
