import test from 'node:test'
import assert from 'node:assert/strict'
import * as User from '../src/models/User.js'
import * as userRepository from '../src/repositories/userRepository.js'
import { validateEmailRequest, validatePasswordChange, validatePasswordReset, validateProfileUpdate } from '../src/validators/accountValidator.js'
import { validateEmailVerification, validateLogin, validateOtpLogin, validateOtpRequest, validateRegistration } from '../src/validators/authValidator.js'

test('password reset request validates email without account lookup', () => {
  assert.equal(validateEmailRequest({ email: ' PERSON@example.com ' }).isValid, true)
  assert.equal(validateEmailRequest({ email: 'not-an-email' }).isValid, false)
})

test('OTP and verification requests validate normalized email, six digits, and token format', () => {
  assert.equal(validateOtpRequest({ email: ' PERSON@example.com ' }).isValid, true)
  assert.equal(validateOtpRequest({ email: 'not-an-email' }).isValid, false)
  assert.equal(validateOtpLogin({ email: 'person@example.com', otp: '123456' }).isValid, true)
  assert.equal(validateOtpLogin({ email: 'person@example.com', otp: '12a456' }).errors.otp, 'Enter the 6-digit code from your email.')
  assert.equal(validateOtpLogin({ email: 'person@example.com', otp: '12345' }).isValid, false)
  assert.equal(validateEmailVerification({ token: 'v'.repeat(43) }).isValid, true)
  assert.equal(validateEmailVerification({ token: 'invalid' }).isValid, false)
})

test('registration requires a strong password without changing normal login validation', () => {
  const details = { name: 'Cad User', email: 'user@example.com', role: 'student', password: 'StrongPassword7!' }
  assert.equal(validateRegistration(details).isValid, true)
  assert.match(validateRegistration({ ...details, password: 'weakpass' }).errors.password, /12 to 64/)
  assert.match(validateRegistration({ ...details, password: 'StrongPassword7!'.repeat(5) }).errors.password, /12 to 64/)
  assert.equal(validateLogin({ email: 'user@example.com', password: 'legacy8' }).isValid, true)
})

test('profile updates reject role changes and invalid editable fields', () => {
  const validProfile = { name: 'Cad User', email: 'user@example.com', phone: '1234567890', avatarUrl: 'https://example.com/avatar.png' }
  assert.equal(validateProfileUpdate(validProfile).isValid, true)
  const elevatedProfile = validateProfileUpdate({ ...validProfile, role: 'admin' })
  assert.equal(elevatedProfile.isValid, false)
  assert.equal(elevatedProfile.errors.role, 'This field cannot be updated.')
  assert.equal(validateProfileUpdate({ ...validProfile, avatarUrl: 'javascript:alert(1)' }).isValid, false)
})

test('password reset rejects weak, mismatched, and malformed reset data', () => {
  const token = 'a'.repeat(43)
  const valid = { token, password: 'StrongPassword7!', confirmPassword: 'StrongPassword7!' }
  assert.equal(validatePasswordReset(valid).isValid, true)
  assert.equal(validatePasswordReset({ ...valid, password: 'weak', confirmPassword: 'weak' }).isValid, false)
  assert.equal(validatePasswordReset({ ...valid, confirmPassword: 'DifferentPassword7!' }).errors.confirmPassword, 'Passwords do not match.')
  assert.equal(validatePasswordReset({ ...valid, token: 'short' }).errors.token, 'This reset link is invalid or has expired.')
})

test('password change requires current password and a different strong confirmation', () => {
  const valid = { currentPassword: 'OldPassword8!', password: 'NewPassword9!', confirmPassword: 'NewPassword9!' }
  assert.equal(validatePasswordChange(valid).isValid, true)
  assert.equal(validatePasswordChange({ ...valid, currentPassword: '', password: 'NewPassword9!' }).errors.currentPassword, 'Current password is required.')
  assert.equal(validatePasswordChange({ ...valid, password: 'OldPassword8!', confirmPassword: 'OldPassword8!' }).isValid, false)
  assert.equal(validatePasswordChange({ ...valid, confirmPassword: 'Mismatch9!' }).errors.confirmPassword, 'Passwords do not match.')
})

test('serialized user profiles never expose password or reset-token data', () => {
  const profile = User.serializeUser({
    _id: 'user-id',
    name: 'Cad User',
    email: 'user@example.com',
    role: 'admin',
    passwordHash: 'secret-hash',
    passwordResetTokenHash: 'secret-token-hash',
    passwordResetExpiresAt: new Date()
  })
  assert.deepEqual(profile, { id: 'user-id', name: 'Cad User', email: 'user@example.com', phone: null, role: 'admin', avatarUrl: null })
})

test('password reset consumption matches only unexpired tokens and atomically clears the token', async () => {
  const originalFindOneAndUpdate = User.User.findOneAndUpdate
  const now = new Date('2026-10-01T00:00:00.000Z')
  let capturedFilter
  let capturedUpdate
  User.User.findOneAndUpdate = (filter, update) => {
    capturedFilter = filter
    capturedUpdate = update
    return { select() { return this }, async exec() { return { _id: 'user-id' } } }
  }

  try {
    await userRepository.consumePasswordReset('hashed-token', 'hashed-password', now)
  } finally {
    User.User.findOneAndUpdate = originalFindOneAndUpdate
  }

  assert.deepEqual(capturedFilter, { passwordResetTokenHash: 'hashed-token', passwordResetExpiresAt: { $gt: now } })
  assert.deepEqual(capturedUpdate, { $set: { passwordHash: 'hashed-password' }, $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 }, $inc: { authVersion: 1 } })
})