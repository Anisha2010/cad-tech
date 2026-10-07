import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import * as User from '../src/models/User.js'
import { createAccountService } from '../src/services/accountService.js'
import { getPasswordResetEmailStatus } from '../src/services/emailService.js'

const startTime = new Date('2026-10-01T12:00:00.000Z')
const resetToken = 'A'.repeat(43)

function createHarness({ registered = true, configured = true, sendResult = true, sendError = null } = {}) {
  const user = { _id: 'user-1', email: 'person@example.com', passwordHash: null, authVersion: 0 }
  const state = { tokenHash: null, expiresAt: null, sent: [], logs: [], lookupCount: 0 }
  let currentTime = new Date(startTime)
  const repository = {
    async getUserByEmail(email) {
      state.lookupCount += 1
      return registered && email.toLowerCase() === user.email ? user : null
    },
    async setPasswordReset(userId, tokenHash, expiresAt) {
      assert.equal(userId, user._id)
      state.tokenHash = tokenHash
      state.expiresAt = expiresAt
    },
    async clearPasswordReset(userId, tokenHash) {
      if (userId === user._id && tokenHash === state.tokenHash) {
        state.tokenHash = null
        state.expiresAt = null
      }
    },
    async hasValidPasswordReset(tokenHash, now) {
      return tokenHash === state.tokenHash && state.expiresAt > now
    },
    async consumePasswordReset(tokenHash, passwordHash, now) {
      if (tokenHash !== state.tokenHash || !(state.expiresAt > now)) return null
      user.passwordHash = passwordHash
      user.authVersion += 1
      state.tokenHash = null
      state.expiresAt = null
      return user
    }
  }
  const service = createAccountService({
    repository,
    emailStatus: () => configured ? { configured: true, missing: [] } : { configured: false, missing: ['SMTP_HOST', 'SMTP_FROM'] },
    sendResetEmail: async (email, url) => {
      state.sent.push({ email, url })
      if (sendError) throw sendError
      return sendResult
    },
    frontendUrl: 'https://cadtech.example/path/',
    now: () => new Date(currentTime),
    generateToken: () => resetToken,
    logger: { error: (...items) => state.logs.push(items) }
  })
  return { service, state, user, setTime: (time) => { currentTime = new Date(time) } }
}

test('registered account receives frontend-configured link with hashed token and exact 30-minute expiry', async () => {
  const { service, state } = createHarness()
  assert.equal(await service.requestPasswordReset('person@example.com'), true)
  assert.equal(state.sent.length, 1)
  const url = new URL(state.sent[0].url)
  assert.equal(url.origin, 'https://cadtech.example')
  assert.equal(url.pathname, '/path/reset-password')
  assert.equal(url.searchParams.get('token'), resetToken)
  assert.equal(state.tokenHash, crypto.createHash('sha256').update(resetToken).digest('hex'))
  assert.notEqual(state.tokenHash, resetToken)
  assert.equal(state.expiresAt.getTime() - startTime.getTime(), 30 * 60 * 1000)
  assert.equal(await service.isResetTokenValid(resetToken), true)
})

test('unregistered account gets the same service result and no email', async () => {
  const { service, state } = createHarness({ registered: false })
  assert.equal(await service.requestPasswordReset('missing@example.com'), true)
  assert.equal(state.sent.length, 0)
  assert.equal(state.tokenHash, null)
})

test('SMTP unavailable is non-fatal, does not look up or store a token, and logs only setting names', async () => {
  const { service, state } = createHarness({ configured: false })
  assert.equal(await service.requestPasswordReset('person@example.com'), false)
  assert.equal(state.lookupCount, 0)
  assert.equal(state.sent.length, 0)
  assert.equal(state.tokenHash, null)
  assert.match(state.logs[0][0], /SMTP_HOST, SMTP_FROM/)
  assert.doesNotMatch(JSON.stringify(state.logs), new RegExp(resetToken))
  assert.doesNotMatch(JSON.stringify(state.logs), /smtp-password-value/i)
})

test('delivery failure invalidates the issued token and remains non-fatal', async () => {
  const { service, state } = createHarness({ sendResult: false })
  assert.equal(await service.requestPasswordReset('person@example.com'), false)
  assert.equal(state.tokenHash, null)
  assert.equal(await service.isResetTokenValid(resetToken), false)
})

test('expired, invalid, and reused tokens are rejected; successful reset accepts only the new password', async () => {
  const { service, state, user, setTime } = createHarness()
  await service.requestPasswordReset('person@example.com')
  assert.equal(await service.isResetTokenValid('invalid-token'), false)
  setTime(new Date(startTime.getTime() + 30 * 60 * 1000))
  assert.equal(await service.isResetTokenValid(resetToken), false)
  await assert.rejects(service.resetPassword(resetToken, 'NewStrongPassword9!'), /invalid or has expired/)

  setTime(startTime)
  await service.requestPasswordReset('person@example.com')
  const previousSessionAuthVersion = user.authVersion
  await service.resetPassword(resetToken, 'NewStrongPassword9!')
  assert.equal(await User.verifyPassword('NewStrongPassword9!', user.passwordHash), true)
  assert.notEqual(user.authVersion, previousSessionAuthVersion)
  assert.equal(user.authVersion, previousSessionAuthVersion + 1)
  assert.equal(await User.verifyPassword('OldStrongPassword8!', user.passwordHash), false)
  assert.equal(await service.isResetTokenValid(resetToken), false)
  await assert.rejects(service.resetPassword(resetToken, 'AnotherStrongPassword7!'), /invalid or has expired/)
})

test('email status reports only setting names and never their values', () => {
  const status = getPasswordResetEmailStatus()
  assert.equal(typeof status.configured, 'boolean')
  assert.ok(Array.isArray(status.missing))
  assert.ok(status.missing.every((name) => typeof name === 'string'))
  assert.ok(status.missing.every((name) => /SMTP_|FRONTEND_URL/.test(name)))
  assert.equal(JSON.stringify(status).toLowerCase().includes('password'), false)
  assert.equal(JSON.stringify(status).toLowerCase().includes('secret'), false)
  assert.equal(JSON.stringify(status).toLowerCase().includes('smtp_password'), false)
})