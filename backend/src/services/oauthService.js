/**
 * OAuth Service
 * Contains business logic for OAuth authentication
 * Handles Google and GitHub OAuth flows
 */
import crypto from 'node:crypto'
import config from '../config/environment.js'
import * as db from '../repositories/userRepository.js'
import * as User from '../models/User.js'
import * as authService from './authService.js'
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
  const linkedUser = await db.getUserByProvider(provider, providerUserId)
  if (linkedUser) {
    if (linkedUser.accountStatus === 'blocked') throw new AppError('This account is blocked. Contact an administrator.', 403, null, 'ACCOUNT_BLOCKED')
    if (linkedUser.accountStatus === 'deleted' || linkedUser.deletedAt) throw new AppError('This account is no longer available.', 401)
    return linkedUser
  }

  // Check if email already exists
  if (email) {
    const existingUser = await db.getUserByEmail(email)
    if (existingUser) {
      throw new AppError('An account with this email already exists.', 409)
    }
  }

  // Create new user. MongoDB owns `_id`; avoid saving a random custom `id` field.
  const newUser = {
    name: String(name || 'User').trim() || 'User',
    email: email ? User.normalizeEmail(email) : `${provider}-${providerUserId}@placeholder.local`,
    phone: null,
    role: 'student', // Default role for new OAuth users
    passwordHash: null, // OAuth-only users have no password
    emailVerified: true,
    authProviders: [{ provider, providerUserId: String(providerUserId) }],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  try {
    return await db.createUser(newUser)
  } catch (error) {
    if (error?.code === 11000) throw new AppError('An account with this email already exists.', 409)
    throw error
  }
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
export const buildFrontendCallbackUrl = (status, reason = '', provider = '') => {
  const url = new URL('/auth/callback', config.frontend_url)
  url.searchParams.set('status', status)
  if (reason) {
    url.searchParams.set('reason', reason)
  }
  if (provider === 'google' || provider === 'github') {
    url.searchParams.set('provider', provider)
  }
  return url.toString()
}

/**
 * Create authenticated session after OAuth
 */
export const createOAuthSession = async (req, user) => {
  return authService.createAuthenticatedSession(req, user)
}

export default {
  buildOAuthState,
  validateOAuthState,
  findOrCreateOAuthUser,
  clearOAuthState,
  buildFrontendCallbackUrl,
  createOAuthSession
}
