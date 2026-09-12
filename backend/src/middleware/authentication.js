/**
 * Authentication middleware
 * Verifies that user is authenticated and has valid session
 */
import { getUserById } from '../repositories/userRepository.js'
import * as User from '../models/User.js'
import { sendError } from '../utils/response.js'

/**
 * Middleware: Require authentication
 * Attaches authenticated user to req.user
 */
export const requireAuthentication = async (req, res, next) => {
  const userId = req.session?.userId

  if (!userId) {
    return sendError(res, 'Authentication required.', 401)
  }

  const user = await getUserById(userId)

  if (!user) {
    req.session.destroy(() => { })
    return sendError(res, 'Authentication required.', 401)
  }

  req.user = User.serializeUser(user)

  next()
}

export default requireAuthentication
