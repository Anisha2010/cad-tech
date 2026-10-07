/**
 * Auth Controller
 * Handles HTTP requests for authentication endpoints
 * Delegates business logic to authService
 */
import * as authService from '../services/authService.js'
import * as accountService from '../services/accountService.js'
import * as emailAuthService from '../services/emailAuthService.js'
import * as User from '../models/User.js'
import asyncHandler from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'
import config from '../config/environment.js'

/**
 * POST /auth/register
 * Register new user with email and password
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, role, password } = req.body

  // Register user
  const user = await authService.registerUser({
    name,
    email,
    phone,
    role,
    password
  })

  void emailAuthService.sendVerificationForUser(user, { ignoreCooldown: true }).catch((error) => {
    console.error('[Auth] Verification email scheduling failed.', {
      code: typeof error?.code === 'string' ? error.code : 'UNKNOWN'
    })
  })
  sendSuccess(res, { email: user.email, resendAfterSeconds: config.auth_email_resend_cooldown_seconds }, 'Account created. Check your email to verify your account.', 201)
})

/**
 * POST /auth/login
 * Login user with email and password
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  // Authenticate user
  const user = await authService.loginUser(email, password)
  // Create session
  const authenticatedUser = await authService.createAuthenticatedSession(req, user)

  // Return serialized user
  sendSuccess(res, { user: User.serializeUser(authenticatedUser) }, 'Login successful.')
})

/**
 * GET /auth/me
 * Get current authenticated user
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  sendSuccess(res, { user: req.user }, 'User retrieved successfully.')
})

/**
 * POST /auth/logout
 * Logout user and destroy session
 */
export const logout = asyncHandler(async (req, res) => {
  await authService.destroySession(req)
  res.clearCookie('cadtech.sid')
  sendSuccess(res, null, 'Logout successful.')
})

export const requestPasswordReset = asyncHandler(async (req, res) => {
  try {
    await accountService.requestPasswordReset(req.body.email)
  } catch {
    console.error('[Auth] Password reset request could not be processed.')
  }
  sendSuccess(res, null, 'If an account exists for that email, password reset instructions will be sent.')
})

export const getPasswordResetStatus = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV !== 'development') return res.sendStatus(404)
  const { getPasswordResetEmailStatus } = await import('../services/emailService.js')
  sendSuccess(res, getPasswordResetEmailStatus(), 'Development-only password reset delivery status.')
})

export const validatePasswordResetToken = asyncHandler(async (req, res) => {
  const isValid = await accountService.isResetTokenValid(req.body.token)
  sendSuccess(res, { valid: isValid }, isValid ? 'Reset link is valid.' : 'This reset link is invalid or has expired.')
})

export const resetPassword = asyncHandler(async (req, res) => {
  await accountService.resetPassword(req.body.token, req.body.password)
  sendSuccess(res, null, 'Password reset successful. You can now sign in.')
})

export const requestLoginOtp = asyncHandler(async (req, res) => {
  await emailAuthService.requestLoginOtp(req.body.email)
  sendSuccess(res, { resendAfterSeconds: config.auth_email_resend_cooldown_seconds }, 'If this email is registered and verified, a sign-in code will be sent.')
})

export const loginWithOtp = asyncHandler(async (req, res) => {
  const user = await emailAuthService.verifyLoginOtp(req.body.email, req.body.otp)
  const authenticatedUser = await authService.createAuthenticatedSession(req, user)
  sendSuccess(res, { user: User.serializeUser(authenticatedUser) }, 'Login successful.')
})

export const verifyEmail = asyncHandler(async (req, res) => {
  await emailAuthService.verifyEmail(req.body.token)
  sendSuccess(res, { emailVerified: true }, 'Email verified successfully. You can now sign in.')
})

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  await emailAuthService.resendVerificationEmail(req.body.email)
  sendSuccess(res, { resendAfterSeconds: config.auth_email_resend_cooldown_seconds }, 'If this account needs verification, an email will be sent shortly.')
})

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await accountService.updateProfile(req.user.id, req.body)
  sendSuccess(res, { user: User.serializeUser(user) }, 'Profile updated successfully.')
})

export const changePassword = asyncHandler(async (req, res) => {
  await accountService.changePassword(req.user.id, req.body.currentPassword, req.body.password)
  await authService.createAuthenticatedSession(req, req.user)
  sendSuccess(res, null, 'Password changed successfully.')
})

export default {
  register,
  login,
  getCurrentUser,
  logout,
  requestPasswordReset,
  requestLoginOtp,
  loginWithOtp,
  verifyEmail,
  resendVerificationEmail,
  getPasswordResetStatus,
  validatePasswordResetToken,
  resetPassword,
  updateProfile,
  changePassword
}
