/**
 * Authorization middleware
 * Verifies that authenticated user has required roles
 */
import { sendError } from '../utils/response.js'

/**
 * Factory function to create role authorization middleware
 * @param {...string} allowedRoles - Roles that are permitted
 * @returns {Function} Express middleware function
 */
export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401)
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'You do not have permission to access this resource.', 403)
    }

    next()
  }
}

export default allowRoles
