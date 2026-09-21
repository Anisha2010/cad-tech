/**
 * Auth Routes
 * Defines authentication endpoints
 */
import express from 'express'
import * as authController from '../controllers/authController.js'
import * as oauthController from '../controllers/oauthController.js'
import { validateRequest, handleValidationResult } from '../middleware/validation.js'
import { validateRegistration, validateLogin } from '../validators/authValidator.js'
import { requireAuthentication } from '../middleware/authentication.js'

const router = express.Router()
const loginAttempts = new Map()
const limitLoginAttempts = (req, res, next) => {
  const key = req.ip || 'unknown'
  const now = Date.now()
  const recent = (loginAttempts.get(key) || []).filter((time) => now - time < 60000)
  if (recent.length >= 10) return res.status(429).json({ success: false, message: 'Too many login attempts. Please try again later.' })
  recent.push(now)
  loginAttempts.set(key, recent)
  next()
}
const rejectPublicAdminRegistration = (req, res, next) => {
  if (typeof req.body?.role === 'string' && req.body.role.toLowerCase() === 'admin') {
    return res.status(400).json({ success: false, message: 'This account type cannot be created through public registration.' })
  }
  next()
}

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Registration
router.post(
  '/register',
  rejectPublicAdminRegistration,
  validateRequest(validateRegistration),
  handleValidationResult,
  authController.register
)

// Login
router.post(
  '/login',
  limitLoginAttempts,
  validateRequest(validateLogin),
  handleValidationResult,
  authController.login
)

// Get current user (requires authentication)
router.get('/me', requireAuthentication, authController.getCurrentUser)

// Logout
router.post('/logout', authController.logout)

// Google OAuth
router.get('/google', oauthController.startGoogleAuth)
router.get('/google/callback', oauthController.handleGoogleCallback)

// GitHub OAuth
router.get('/github', oauthController.startGitHubAuth)
router.get('/github/callback', oauthController.handleGitHubCallback)

export default router
