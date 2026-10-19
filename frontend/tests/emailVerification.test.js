import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidVerificationToken, requestEmailVerification, verifyEmailOnce } from '../src/utils/emailVerification.js'

test('accepts only generated verification token shapes', () => {
  assert.equal(isValidVerificationToken('a'.repeat(43)), true)
  assert.equal(isValidVerificationToken('short'), false)
  assert.equal(isValidVerificationToken('a'.repeat(42) + '+'), false)
})

test('integrates with the existing verification endpoint and token body contract', async () => {
  const token = 'i'.repeat(43)
  const requests = []
  const response = { configured: true, data: { data: { emailVerified: true } } }
  const result = await requestEmailVerification(async (...args) => {
    requests.push(args)
    return response
  }, token)

  assert.deepEqual(requests, [['post', '/auth/verify-email', { token }]])
  assert.equal(result, response)
  await assert.rejects(
    requestEmailVerification(async () => ({ configured: false }), token),
    /not configured/
  )
})

test('deduplicates concurrent verification requests and requires backend confirmation', async () => {
  const token = 'v'.repeat(43)
  let requestCount = 0
  let resolveRequest
  const verifyRequest = () => {
    requestCount += 1
    return new Promise((resolve) => { resolveRequest = resolve })
  }

  const first = verifyEmailOnce(token, verifyRequest)
  const second = verifyEmailOnce(token, verifyRequest)
  await Promise.resolve()
  assert.equal(requestCount, 1)
  resolveRequest({ data: { data: { emailVerified: true } } })
  assert.deepEqual(await Promise.all([first, second]), [
    { data: { data: { emailVerified: true } } },
    { data: { data: { emailVerified: true } } }
  ])
})

test('does not accept an unconfirmed API response as successful verification', async () => {
  await assert.rejects(
    verifyEmailOnce('x'.repeat(43), async () => ({ data: { data: { emailVerified: false } } })),
    /did not confirm/
  )
})
