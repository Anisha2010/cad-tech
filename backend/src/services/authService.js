/**
 * Auth Service
 * Contains business logic for authentication
 * Handles user registration, login, and session management
 */
import crypto from 'node:crypto'
import * as db from '../config/database.js'
import * as User from '../models/User.js'
import { AppError } from '../utils/AppError.js'

/**
 * Register new user with email and password
 */
export const registerUser = async (userData) => {
  const { name, email, phone, role, password } = userData

  // Check if user already exists
  const existingUser = db.getUserByEmail(email)
  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409)
  }

  // Hash password
  const passwordHash = await User.hashPassword(password)

  // Create user object
  const newUser = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    email: User.normalizeEmail(email),
    phone: phone ? String(phone).trim() : null,
    role: User.validateRole(role) ? role : 'student',
    passwordHash,
    authProviders: [{ provider: 'local', providerUserId: `local:${crypto.randomUUID()}` }],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  // Save to database
  db.createUser(newUser)

  return newUser
}

/**
 * Login user with email and password
 */
export const loginUser = async (email, password) => {
  const user = db.getUserByEmail(email)

  // Return generic message to prevent user enumeration
  if (!user || !user.passwordHash) {
    throw new AppError('Invalid email or password.', 401)
  }

  // Verify password
  const isValid = await User.verifyPassword(password, user.passwordHash)

  if (!isValid) {
    throw new AppError('Invalid email or password.', 401)
  }

  return user
}

/**
 * Create authenticated session
 */
export const createAuthenticatedSession = async (req, user) => {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(new AppError('Unable to create session.', 500))

      req.session.userId = user.id
      req.session.role = user.role

      req.session.save((saveError) => {
        if (saveError) return reject(new AppError('Unable to create session.', 500))
        resolve()
      })
    })
  })
}

/**
 * Destroy session
 */
export const destroySession = async (req) => {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(new AppError('Unable to log out right now.', 500))
      } else {
        resolve()
      }
    })
  })
}

/**
 * Get current user from session
 */
export const getCurrentUser = (req) => {
  const userId = req.session?.userId

  if (!userId) {
    return null
  }

  const user = db.getUserById(userId)

  if (!user) {
    return null
  }

  return user
}

export default {
  registerUser,
  loginUser,
  createAuthenticatedSession,
  destroySession,
  getCurrentUser
}
