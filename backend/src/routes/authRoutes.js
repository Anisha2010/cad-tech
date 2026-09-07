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

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Registration
router.post(
  '/register',
  validateRequest(validateRegistration),
  handleValidationResult,
  authController.register
)

// Login
router.post(
  '/login',
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
