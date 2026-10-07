import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { normalizeEmail } from '../models/User.js'

const toPlainUser = (user) => user ? user.toObject({ versionKey: false }) : null

export const getUserById = async (userId, { includePassword = false } = {}) => {
  const normalizedUserId = String(userId || '').trim()
  if (!normalizedUserId) return null

  let query = null
  if (mongoose.isValidObjectId(normalizedUserId)) {
    query = User.findById(normalizedUserId)
  } else {
    query = User.findOne({ id: normalizedUserId })
  }

  if (!query) return null
  if (includePassword) query.select('+passwordHash')
  return toPlainUser(await query.exec())
}

export const getUserByEmail = async (email, { includePassword = false, includeAuthTokens = false } = {}) => {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null
  const query = User.findOne({ email: normalizedEmail })
  if (includePassword) query.select('+passwordHash')
  if (includeAuthTokens) query.select('+emailVerificationTokenHash +emailVerificationExpiresAt +emailVerificationSentAt +loginOtpHash +loginOtpExpiresAt +loginOtpAttempts +loginOtpSentAt')
  return toPlainUser(await query.exec())
}

export const getUserByProvider = async (provider, providerUserId) => {
  const user = await User.findOne({ authProviders: { $elemMatch: { provider, providerUserId: String(providerUserId) } } }).exec()
  return toPlainUser(user)
}

export const createUser = async (userData) => {
  const user = await User.create({ ...userData, email: normalizeEmail(userData.email) })
  return toPlainUser(user)
}

export const updateUser = async (userId, updates) => {
  if (!mongoose.isValidObjectId(userId)) return null
  const allowedUpdates = {}
  for (const field of ['name', 'phone', 'avatarUrl', 'authProviders']) {
    if (Object.hasOwn(updates, field)) allowedUpdates[field] = updates[field]
  }
  const user = await User.findByIdAndUpdate(userId, allowedUpdates, { new: true, runValidators: true }).exec()
  return toPlainUser(user)
}

export const updateProfile = async (userId, updates) => {
  if (!mongoose.isValidObjectId(userId)) return null
  const allowedUpdates = {}
  for (const field of ['name', 'phone', 'avatarUrl']) {
    if (Object.hasOwn(updates, field)) allowedUpdates[field] = updates[field]
  }
  if (Object.hasOwn(updates, 'email')) allowedUpdates.email = normalizeEmail(updates.email)
  const user = await User.findByIdAndUpdate(userId, allowedUpdates, { new: true, runValidators: true }).exec()
  return toPlainUser(user)
}

export const markLogin = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) return null
  const user = await User.findOneAndUpdate({
    _id: userId,
    $or: [{ accountStatus: 'active' }, { accountStatus: { $exists: false } }],
    deletedAt: null
  }, { $set: { lastLoginAt: new Date() } }, { new: true }).exec()
  return toPlainUser(user)
}

export const setPasswordReset = async (userId, tokenHash, expiresAt) => {
  if (!mongoose.isValidObjectId(userId)) return null
  return User.findByIdAndUpdate(userId, { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt }, { new: true }).exec()
}

export const clearPasswordReset = async (userId, tokenHash) => {
  if (!mongoose.isValidObjectId(userId)) return null
  return User.findOneAndUpdate(
    { _id: userId, passwordResetTokenHash: tokenHash },
    { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } },
    { new: true }
  ).exec()
}

export const hasValidPasswordReset = async (tokenHash, now = new Date()) => Boolean(await User.exists({
  passwordResetTokenHash: tokenHash,
  passwordResetExpiresAt: { $gt: now }
}).exec())

export const consumePasswordReset = async (tokenHash, passwordHash, now = new Date()) => User.findOneAndUpdate(
  { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: now } },
  { $set: { passwordHash }, $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 }, $inc: { authVersion: 1 } },
  { new: true }
).select('+passwordHash').exec()

export const issueLoginOtp = async (userId, otpHash, expiresAt, sentAt, cooldownCutoff) => {
  const filter = { _id: userId, emailVerified: { $ne: false } }
  if (cooldownCutoff) filter.$or = [{ loginOtpSentAt: null }, { loginOtpSentAt: { $exists: false } }, { loginOtpSentAt: { $lte: cooldownCutoff } }]
  return User.findOneAndUpdate(filter, {
    $set: { loginOtpHash: otpHash, loginOtpExpiresAt: expiresAt, loginOtpAttempts: 0, loginOtpSentAt: sentAt }
  }, { new: true }).exec()
}

export const clearLoginOtp = async (userId, otpHash) => {
  if (!mongoose.isValidObjectId(userId)) return null
  const filter = { _id: userId }
  if (otpHash) filter.loginOtpHash = otpHash
  return User.findOneAndUpdate(filter, {
    $unset: { loginOtpHash: 1, loginOtpExpiresAt: 1, loginOtpAttempts: 1, loginOtpSentAt: 1 }
  }, { new: true }).exec()
}

export const recordLoginOtpFailure = async (email, otpHash, now = new Date(), maxAttempts = 5) => {
  const user = await User.findOneAndUpdate({
    email: normalizeEmail(email),
    loginOtpHash: otpHash,
    loginOtpExpiresAt: { $gt: now },
    loginOtpAttempts: { $lt: maxAttempts }
  }, { $inc: { loginOtpAttempts: 1 } }, { new: true }).select('+loginOtpAttempts').exec()
  if (!user) return maxAttempts
  if (user.loginOtpAttempts >= maxAttempts) {
    await User.findOneAndUpdate({ _id: user._id, loginOtpHash: otpHash }, {
      $unset: { loginOtpHash: 1, loginOtpExpiresAt: 1 }
    }).exec()
  }
  return user.loginOtpAttempts
}

export const consumeLoginOtp = async (email, otpHash, now = new Date(), maxAttempts = 5) => User.findOneAndUpdate({
  email: normalizeEmail(email),
  emailVerified: { $ne: false },
  loginOtpHash: otpHash,
  loginOtpExpiresAt: { $gt: now },
  loginOtpAttempts: { $lt: maxAttempts }
}, {
  $unset: { loginOtpHash: 1, loginOtpExpiresAt: 1, loginOtpAttempts: 1 }
}, { new: true }).exec()

export const issueEmailVerification = async (userId, tokenHash, expiresAt, sentAt, cooldownCutoff) => {
  const filter = { _id: userId, emailVerified: false }
  if (cooldownCutoff) filter.$or = [{ emailVerificationSentAt: null }, { emailVerificationSentAt: { $exists: false } }, { emailVerificationSentAt: { $lte: cooldownCutoff } }]
  return User.findOneAndUpdate(filter, {
    $set: { emailVerificationTokenHash: tokenHash, emailVerificationExpiresAt: expiresAt, emailVerificationSentAt: sentAt }
  }, { new: true }).exec()
}

export const clearEmailVerification = async (userId, tokenHash) => {
  if (!mongoose.isValidObjectId(userId)) return null
  const filter = { _id: userId }
  if (tokenHash) filter.emailVerificationTokenHash = tokenHash
  return User.findOneAndUpdate(filter, {
    $unset: { emailVerificationTokenHash: 1, emailVerificationExpiresAt: 1, emailVerificationSentAt: 1 }
  }, { new: true }).exec()
}

export const consumeEmailVerification = async (tokenHash, now = new Date()) => User.findOneAndUpdate({
  emailVerificationTokenHash: tokenHash,
  emailVerificationExpiresAt: { $gt: now },
  emailVerified: false
}, {
  $set: { emailVerified: true },
  $unset: { emailVerificationTokenHash: 1, emailVerificationExpiresAt: 1, emailVerificationSentAt: 1 }
}, { new: true }).exec()

export const changePassword = async (userId, passwordHash) => {
  if (!mongoose.isValidObjectId(userId)) return null
  return User.findByIdAndUpdate(userId, {
    $set: { passwordHash },
    $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
    $inc: { authVersion: 1 }
  }, { new: true }).exec()
}

export default { getUserById, getUserByEmail, getUserByProvider, createUser, updateUser, updateProfile, markLogin, setPasswordReset, clearPasswordReset, hasValidPasswordReset, consumePasswordReset, issueLoginOtp, clearLoginOtp, recordLoginOtpFailure, consumeLoginOtp, issueEmailVerification, clearEmailVerification, consumeEmailVerification, changePassword }