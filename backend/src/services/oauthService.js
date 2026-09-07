/**
 * OAuth Service
 * Contains business logic for OAuth authentication
 * Handles Google and GitHub OAuth flows
 */
import crypto from 'node:crypto'
import config from '../config/environment.js'
import * as db from '../config/database.js'
import * as User from '../models/User.js'
import { AppError } from '../utils/AppError.js'

const OAUTH_STATE_TIMEOUT = 5 * 60 * 1000 // 5 minutes

/**
 * Build OAuth state for PKCE/CSRF protection
 */
export const buildOAuthState = (req, provider) => {
  const state = crypto.randomBytes(32).toString('hex')
  const nonce = crypto.randomBytes(24).toString('hex')

  req.session.oauthState = {
    provider,
    state,
    nonce,
    createdAt: Date.now()
  }

  return { state, nonce }
}

/**
 * Validate OAuth state
 */
export const validateOAuthState = (req, provider, incomingState) => {
  const savedState = req.session.oauthState

  if (!savedState || savedState.provider !== provider) {
    return null
  }

  if (!incomingState || savedState.state !== incomingState) {
    return null
  }

  if (Date.now() - savedState.createdAt > OAUTH_STATE_TIMEOUT) {
    return null
  }

  return savedState
}

/**
 * Find or create user from OAuth provider
 */
export const findOrCreateOAuthUser = async ({ provider, providerUserId, email, name }) => {
  // Check if user already linked with this provider
  const linkedUser = db.getUserByProvider(provider, providerUserId)
  if (linkedUser) {
    return linkedUser
  }

  // Check if email already exists
  if (email) {
    const existingUser = db.getUserByEmail(email)
    if (existingUser) {
      throw new AppError('An account with this email already exists.', 409)
    }
  }

  // Create new user
  const newUser = {
    id: crypto.randomUUID(),
    name: String(name || 'User').trim() || 'User',
    email: email ? User.normalizeEmail(email) : `${provider}-${providerUserId}@placeholder.local`,
    phone: null,
    role: 'student', // Default role for new OAuth users
    passwordHash: null, // OAuth-only users have no password
    authProviders: [{ provider, providerUserId: String(providerUserId) }],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  db.createUser(newUser)
  return newUser
}

/**
 * Clear OAuth state after use
 */
export const clearOAuthState = (req) => {
  if (req.session) {
    delete req.session.oauthState
  }
}

/**
 * Build frontend callback URL
 */
export const buildFrontendCallbackUrl = (status, reason = '') => {
  const url = new URL('/auth/callback', config.frontend_url)
  url.searchParams.set('status', status)
  if (reason) {
    url.searchParams.set('reason', reason)
  }
  return url.toString()
}

/**
 * Create authenticated session after OAuth
 */
export const createOAuthSession = async (req, user) => {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(new AppError('Unable to create session.', 500))
        return
      }

      req.session.userId = user.id
      req.session.role = user.role

      req.session.save((saveError) => {
        if (saveError) {
          reject(new AppError('Unable to create session.', 500))
        } else {
          resolve()
        }
      })
    })
  })
}

export default {
  buildOAuthState,
  validateOAuthState,
  findOrCreateOAuthUser,
  clearOAuthState,
  buildFrontendCallbackUrl,
  createOAuthSession
}
