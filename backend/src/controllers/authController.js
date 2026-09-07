/**
 * Auth Controller
 * Handles HTTP requests for authentication endpoints
 * Delegates business logic to authService
 */
import * as authService from '../services/authService.js'
import * as User from '../models/User.js'
import asyncHandler from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

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

  // Create session
  await authService.createAuthenticatedSession(req, user)

  // Return serialized user
  sendSuccess(res, { user: User.serializeUser(user) }, 'Registration successful.', 201)
})

/**
 * POST /auth/login
 * Login user with email and password
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  // Authenticate user
  const user = await authService.loginUser(email, password)
  // console.log(user);
  // Create session
  await authService.createAuthenticatedSession(req, user)

  // Return serialized user
  sendSuccess(res, { user: User.serializeUser(user) }, 'Login successful.')
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

export default {
  register,
  login,
  getCurrentUser,
  logout
}
