import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

/**
 * User schema structure
 * {
 *   id: string (UUID),
 *   name: string,
 *   email: string (lowercase, normalized),
 *   phone: string | null,
 *   role: 'student' | 'instructor',
 *   passwordHash: string | null (null for OAuth-only users),
 *   authProviders: Array<{provider, providerUserId}>,
 *   createdAt: Date,
 *   updatedAt: Date
 * }
 */

/**
 * Create a new user object
 */
/**
 * Normalize email (lowercase and trim)
 */
export const normalizeEmail = (email) => {
  return String(email || '').trim().toLowerCase()
}

/**
 * Validate user role
 */
export const validateRole = (role, { allowAdmin = false } = {}) => {
  const normalized = String(role || '').toLowerCase()
  const allowedRoles = allowAdmin ? ['student', 'instructor', 'admin'] : ['student', 'instructor']
  return allowedRoles.includes(normalized)
}

/**
 * Hash password
 */
export const hashPassword = async (password) => {
  return bcrypt.hash(password, 12)
}

/**
 * Verify password
 */
export const verifyPassword = async (password, hash) => {
  return bcrypt.compare(String(password), hash)
}

/**
 * Serialize user for API response
 * Removes sensitive fields
 */
export const serializeUser = (user) => {
  const plainUser = typeof user.toObject === 'function' ? user.toObject() : user
  return {
    id: String(plainUser.id || plainUser._id),
    name: plainUser.name,
    email: plainUser.email,
    phone: plainUser.phone ?? null,
    role: plainUser.role,
    avatarUrl: plainUser.avatarUrl ?? null
  }
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: null },
  role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'student' },
  passwordHash: { type: String, default: null, select: false },
  avatarUrl: { type: String, default: null },
  authProviders: [{ provider: String, providerUserId: String }],
  legacyId: { type: String, select: false }
}, { timestamps: true, versionKey: false, toJSON: { transform: (_, ret) => { ret.id = String(ret._id); delete ret._id; return ret } } })

export const User = mongoose.models.User || mongoose.model('User', userSchema)

export default {
  normalizeEmail,
  validateRole,
  hashPassword,
  verifyPassword,
  serializeUser,
  User
}
