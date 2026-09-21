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

export const getUserByEmail = async (email, { includePassword = false } = {}) => {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null
  const query = User.findOne({ email: normalizedEmail })
  if (includePassword) query.select('+passwordHash')
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

export default { getUserById, getUserByEmail, getUserByProvider, createUser, updateUser }