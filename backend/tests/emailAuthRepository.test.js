import test from 'node:test'
import assert from 'node:assert/strict'
import { User } from '../src/models/User.js'
import * as repository from '../src/repositories/userRepository.js'

function replaceFindOneAndUpdate(handler) {
  const original = User.findOneAndUpdate
  User.findOneAndUpdate = handler
  return () => { User.findOneAndUpdate = original }
}

test('OTP issuance atomically enforces cooldown and replaces the previous code while resetting attempts', async () => {
  let filter
  let update
  let options
  const restore = replaceFindOneAndUpdate((nextFilter, nextUpdate, nextOptions) => {
    filter = nextFilter
    update = nextUpdate
    options = nextOptions
    return { async exec() { return { _id: '507f1f77bcf86cd799439011' } } }
  })
  const sentAt = new Date('2026-10-01T12:00:00.000Z')
  const cutoff = new Date(sentAt.getTime() - 60_000)
  try {
    await repository.issueLoginOtp('507f1f77bcf86cd799439011', 'otp-hash', new Date(sentAt.getTime() + 600_000), sentAt, cutoff)
  } finally {
    restore()
  }
  assert.deepEqual(filter, {
    _id: '507f1f77bcf86cd799439011',
    emailVerified: { $ne: false },
    $or: [{ loginOtpSentAt: null }, { loginOtpSentAt: { $exists: false } }, { loginOtpSentAt: { $lte: cutoff } }]
  })
  assert.deepEqual(update, { $set: { loginOtpHash: 'otp-hash', loginOtpExpiresAt: new Date(sentAt.getTime() + 600_000), loginOtpAttempts: 0, loginOtpSentAt: sentAt } })
  assert.deepEqual(options, { new: true })
})

test('OTP and verification consumption atomically require unexpired, unused state', async () => {
  const calls = []
  const restore = replaceFindOneAndUpdate((filter, update, options) => {
    calls.push({ filter, update, options })
    return { async exec() { return { _id: '507f1f77bcf86cd799439011' } } }
  })
  const now = new Date('2026-10-01T12:00:00.000Z')
  try {
    await repository.consumeLoginOtp(' PERSON@example.com ', 'otp-hash', now, 5)
    await repository.consumeEmailVerification('verification-hash', now)
  } finally {
    restore()
  }
  assert.deepEqual(calls[0], {
    filter: { email: 'person@example.com', emailVerified: { $ne: false }, loginOtpHash: 'otp-hash', loginOtpExpiresAt: { $gt: now }, loginOtpAttempts: { $lt: 5 } },
    update: { $unset: { loginOtpHash: 1, loginOtpExpiresAt: 1, loginOtpAttempts: 1 } },
    options: { new: true }
  })
  assert.deepEqual(calls[1], {
    filter: { emailVerificationTokenHash: 'verification-hash', emailVerificationExpiresAt: { $gt: now }, emailVerified: false },
    update: { $set: { emailVerified: true }, $unset: { emailVerificationTokenHash: 1, emailVerificationExpiresAt: 1, emailVerificationSentAt: 1 } },
    options: { new: true }
  })
})
