import test from 'node:test'
import assert from 'node:assert/strict'
import corsConfig from '../src/config/cors.js'

const resolveOrigin = (origin) => new Promise((resolve, reject) => {
  corsConfig.origin(origin, (error, allowedOrigin) => {
    if (error) reject(error)
    else resolve(allowedOrigin)
  })
})

test('E2E CORS permits only the configured loopback frontend origins', async () => {
  const previousE2E = process.env.E2E_MODE
  process.env.E2E_MODE = 'true'
  try {
    assert.equal(await resolveOrigin('http://127.0.0.1:5173'), 'http://127.0.0.1:5173')
    assert.equal(await resolveOrigin('http://localhost:5173'), 'http://localhost:5173')
    await assert.rejects(resolveOrigin('http://example.com'), (error) => error.code === 'CORS_ORIGIN_REJECTED')
  } finally {
    if (previousE2E === undefined) delete process.env.E2E_MODE
    else process.env.E2E_MODE = previousE2E
  }
})
