/**
 * User Model
 * Defines the user data structure and associated methods
 * Currently stored in JSON, but structure is compatible with MongoDB migration
 */
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

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
export const createUserObject = ({
  name,
  email,
  phone = null,
  role = 'student',
  password = null,
  authProviders = []
}) => {
  const user = {
    id: crypto.randomUUID(),
    name: String(name || '').trim(),
    email: normalizeEmail(email),
    phone: phone ? String(phone).trim() : null,
    role: validateRole(role) ? role : 'student',
    passwordHash: password ? null : null, // Will be hashed if password exists
    authProviders,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return user
}

/**
 * Normalize email (lowercase and trim)
 */
export const normalizeEmail = (email) => {
  return String(email || '').trim().toLowerCase()
}

/**
 * Validate user role
 */
export const validateRole = (role) => {
  return ['student', 'instructor'].includes(String(role).toLowerCase())
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
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null
  }
}

export default {
  createUserObject,
  normalizeEmail,
  validateRole,
  hashPassword,
  verifyPassword,
  serializeUser
}
