/**
 * Authentication middleware
 * Verifies that user is authenticated and has valid session
 */
import { getUserById } from '../config/database.js'
import { sendError } from '../utils/response.js'

/**
 * Middleware: Require authentication
 * Attaches authenticated user to req.user
 */
export const requireAuthentication = (req, res, next) => {
  const userId = req.session?.userId

  if (!userId) {
    return sendError(res, 'Authentication required.', 401)
  }

  const user = getUserById(userId)

  if (!user) {
    req.session.destroy(() => { })
    return sendError(res, 'Authentication required.', 401)
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null
  }

  next()
}

export default requireAuthentication
