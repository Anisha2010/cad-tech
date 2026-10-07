/**
 * Auth Routes
 * Defines authentication endpoints
 */
import express from 'express'
import * as authController from '../controllers/authController.js'
import * as oauthController from '../controllers/oauthController.js'
import { validateRequest, handleValidationResult } from '../middleware/validation.js'
import { validateRegistration, validateLogin, validateOtpRequest, validateOtpLogin, validateEmailVerification } from '../validators/authValidator.js'
import { validateEmailRequest, validatePasswordChange, validatePasswordReset, validateProfileUpdate } from '../validators/accountValidator.js'
import { requireAuthentication } from '../middleware/authentication.js'
import { uploadProfileImage } from '../controllers/profileImageController.js'
import { createAuthLimiter, createOtpRequestLimiter, createOtpVerifyLimiter, createVerificationResendLimiter } from '../config/rateLimit.js'

const router = express.Router()
const loginLimiter = createAuthLimiter()
const passwordResetLimiter = createAuthLimiter()
const otpRequestLimiter = createOtpRequestLimiter()
const otpVerifyLimiter = createOtpVerifyLimiter()
const verificationResendLimiter = createVerificationResendLimiter()
const verificationLimiter = createAuthLimiter()
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
  loginLimiter,
  validateRequest(validateLogin),
  handleValidationResult,
  authController.login
)

router.post('/otp/request', otpRequestLimiter, validateRequest(validateOtpRequest), handleValidationResult, authController.requestLoginOtp)
router.post('/otp/verify', otpVerifyLimiter, validateRequest(validateOtpLogin), handleValidationResult, authController.loginWithOtp)
router.post('/verify-email', verificationLimiter, validateRequest(validateEmailVerification), handleValidationResult, authController.verifyEmail)
router.post('/verification/resend', verificationResendLimiter, validateRequest(validateOtpRequest), handleValidationResult, authController.resendVerificationEmail)

router.post('/forgot-password', passwordResetLimiter, validateRequest(validateEmailRequest), handleValidationResult, authController.requestPasswordReset)
router.get('/password-reset/status', authController.getPasswordResetStatus)
router.post('/validate-reset-token', passwordResetLimiter, authController.validatePasswordResetToken)
router.post('/reset-password', passwordResetLimiter, validateRequest(validatePasswordReset), handleValidationResult, authController.resetPassword)

// Get current user (requires authentication)
router.get('/me', requireAuthentication, authController.getCurrentUser)
router.get('/profile', requireAuthentication, authController.getCurrentUser)
router.patch('/profile', requireAuthentication, validateRequest(validateProfileUpdate), handleValidationResult, authController.updateProfile)
router.post('/profile/avatar', requireAuthentication, uploadProfileImage)
router.post('/change-password', requireAuthentication, validateRequest(validatePasswordChange), handleValidationResult, authController.changePassword)

// Logout
router.post('/logout', authController.logout)

// Google OAuth
router.get('/google', oauthController.startGoogleAuth)
router.get('/google/callback', oauthController.handleGoogleCallback)

// GitHub OAuth
router.get('/github', oauthController.startGitHubAuth)
router.get('/github/callback', oauthController.handleGitHubCallback)

export default router
