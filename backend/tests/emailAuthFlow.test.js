import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createEmailAuthService } from '../src/services/emailAuthService.js'

const start = new Date('2026-10-01T12:00:00.000Z')
const userId = '507f1f77bcf86cd799439011'

function createHarness({ registered = true, emailVerified = true } = {}) {
  const user = { _id: userId, email: 'person@example.com', emailVerified }
  const state = { user, otpHash: null, otpExpiresAt: null, otpSentAt: null, otpAttempts: 0, verificationHash: null, verificationExpiresAt: null, verificationSentAt: null, deliveredOtps: [], verificationUrls: [] }
  let current = new Date(start)
  let otpNumber = 0
  const repository = {
    async getUserByEmail(email) {
      return registered && email === user.email ? { ...state.user, loginOtpHash: state.otpHash, loginOtpExpiresAt: state.otpExpiresAt, loginOtpSentAt: state.otpSentAt, loginOtpAttempts: state.otpAttempts } : null
    },
    async issueLoginOtp(id, hash, expiresAt, sentAt, cutoff) {
      if (state.otpSentAt && state.otpSentAt > cutoff) return null
      state.otpHash = hash
      state.otpExpiresAt = expiresAt
      state.otpSentAt = sentAt
      state.otpAttempts = 0
      return state.user
    },
    async clearLoginOtp(id, hash) {
      if (hash && state.otpHash !== hash) return null
      state.otpHash = null
      state.otpExpiresAt = null
      state.otpAttempts = 0
      state.otpSentAt = null
      return state.user
    },
    async recordLoginOtpFailure(email, hash, now, maxAttempts) {
      if (email !== user.email || hash !== state.otpHash || state.otpExpiresAt <= now) return maxAttempts
      state.otpAttempts += 1
      if (state.otpAttempts >= maxAttempts) {
        state.otpHash = null
        state.otpExpiresAt = null
      }
      return state.otpAttempts
    },
    async consumeLoginOtp(email, hash, now, maxAttempts) {
      if (email !== user.email || hash !== state.otpHash || state.otpExpiresAt <= now || state.otpAttempts >= maxAttempts || state.user.emailVerified === false) return null
      state.otpHash = null
      state.otpExpiresAt = null
      return state.user
    },
    async issueEmailVerification(id, hash, expiresAt, sentAt, cutoff) {
      if (state.user.emailVerified !== false || (cutoff && state.verificationSentAt && state.verificationSentAt > cutoff)) return null
      state.verificationHash = hash
      state.verificationExpiresAt = expiresAt
      state.verificationSentAt = sentAt
      return state.user
    },
    async clearEmailVerification(id, hash) {
      if (hash && state.verificationHash !== hash) return null
      state.verificationHash = null
      state.verificationExpiresAt = null
      state.verificationSentAt = null
      return state.user
    },
    async consumeEmailVerification(hash, now) {
      if (hash !== state.verificationHash || state.verificationExpiresAt <= now || state.user.emailVerified !== false) return null
      state.user.emailVerified = true
      state.verificationHash = null
      state.verificationExpiresAt = null
      state.verificationSentAt = null
      return state.user
    }
  }
  const service = createEmailAuthService({
    repository,
    otpMailer: async (email, otp) => { state.deliveredOtps.push({ email, otp }); return true },
    verificationMailer: async (email, url) => { state.verificationUrls.push({ email, url }); return true },
    frontendUrl: 'https://cadtech.example',
    secret: 'a-test-secret-with-enough-entropy',
    now: () => new Date(current),
    generateOtp: () => String(++otpNumber).padStart(6, '0'),
    generateToken: () => 'v'.repeat(43),
    otpMaxAttempts: 3,
    otpTtlMs: 60_000,
    verificationTtlMs: 3_600_000,
    resendCooldownMs: 30_000,
    logger: { error() {} }
  })
  return { service, state, setTime: (value) => { current = new Date(value) } }
}

test('OTP request is generic, sends a six-digit code, and stores only an HMAC representation', async () => {
  const { service, state } = createHarness()
  assert.equal(await service.requestLoginOtp(' PERSON@example.com '), true)
  assert.equal(state.deliveredOtps.length, 1)
  assert.equal(state.deliveredOtps[0].otp, '000001')
  assert.notEqual(state.otpHash, state.deliveredOtps[0].otp)
  assert.equal(state.otpHash, crypto.createHmac('sha256', 'a-test-secret-with-enough-entropy').update('person@example.com:000001').digest('hex'))
})

test('unknown, unverified, and resend-cooldown OTP requests return the same generic result without sending', async () => {
  const unknown = createHarness({ registered: false })
  assert.equal(await unknown.service.requestLoginOtp('missing@example.com'), true)
  assert.equal(unknown.state.deliveredOtps.length, 0)

  const unverified = createHarness({ emailVerified: false })
  assert.equal(await unverified.service.requestLoginOtp('person@example.com'), true)
  assert.equal(unverified.state.deliveredOtps.length, 0)

  const cooldown = createHarness()
  await cooldown.service.requestLoginOtp('person@example.com')
  await cooldown.service.requestLoginOtp('person@example.com')
  assert.equal(cooldown.state.deliveredOtps.length, 1)
})

test('new OTP invalidates the old code; valid code is single-use', async () => {
  const { service, state, setTime } = createHarness()
  await service.requestLoginOtp('person@example.com')
  const oldOtp = state.deliveredOtps[0].otp
  setTime(new Date(start.getTime() + 30_001))
  await service.requestLoginOtp('person@example.com')
  const currentOtp = state.deliveredOtps[1].otp
  await assert.rejects(service.verifyLoginOtp('person@example.com', oldOtp), /invalid or expired/)
  assert.equal((await service.verifyLoginOtp('person@example.com', currentOtp))._id, userId)
  await assert.rejects(service.verifyLoginOtp('person@example.com', currentOtp), /invalid or expired/)
})

test('OTP expiry and incorrect-attempt limit reject authentication', async () => {
  const expired = createHarness()
  await expired.service.requestLoginOtp('person@example.com')
  expired.setTime(new Date(start.getTime() + 60_000))
  await assert.rejects(expired.service.verifyLoginOtp('person@example.com', '000001'), /invalid or expired/)

  const limited = createHarness()
  await limited.service.requestLoginOtp('person@example.com')
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await assert.rejects(limited.service.verifyLoginOtp('person@example.com', '999999'), /invalid or expired/)
  }
  await assert.rejects(limited.service.verifyLoginOtp('person@example.com', '999999'), /invalid or expired/)
  await assert.rejects(limited.service.verifyLoginOtp('person@example.com', '000001'), /invalid or expired/)
})

test('verification link is hashed, expires, and can only be consumed once', async () => {
  const { service, state } = createHarness({ emailVerified: false })
  await service.sendVerificationForUser(state.user, { ignoreCooldown: true })
  assert.equal(state.verificationUrls.length, 1)
  const token = new URL(state.verificationUrls[0].url).searchParams.get('token')
  assert.equal(token, 'v'.repeat(43))
  assert.equal(state.verificationHash, crypto.createHash('sha256').update(token).digest('hex'))
  assert.notEqual(state.verificationHash, token)
  assert.equal((await service.verifyEmail(token)).emailVerified, true)
  await assert.rejects(service.verifyEmail(token), /already used/)
  await assert.rejects(service.verifyEmail('invalid'), /invalid or expired/)
})

test('verification token expiry and resend cooldown are enforced', async () => {
  const { service, state, setTime } = createHarness({ emailVerified: false })
  await service.sendVerificationForUser(state.user, { ignoreCooldown: true })
  const expiredToken = new URL(state.verificationUrls[0].url).searchParams.get('token')
  assert.equal(await service.resendVerificationEmail('person@example.com'), true)
  assert.equal(state.verificationUrls.length, 1)
  setTime(new Date(start.getTime() + 3_600_000))
  await assert.rejects(service.verifyEmail(expiredToken), /invalid, expired/)
  await service.resendVerificationEmail('person@example.com')
  assert.equal(state.verificationUrls.length, 2)
})
