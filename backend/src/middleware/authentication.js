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

  if (user.accountStatus === 'blocked') {
    req.session.destroy(() => { })
    res.clearCookie('cadtech.sid')
    return sendError(res, 'This account is blocked. Contact an administrator.', 401, { code: 'ACCOUNT_BLOCKED' })
  }

  if (user.accountStatus === 'deleted' || user.deletedAt) {
    req.session.destroy(() => { })
    res.clearCookie('cadtech.sid')
    return sendError(res, 'This account is no longer available.', 401)
  }

  if (Number(req.session.authVersion || 0) !== Number(user.authVersion || 0)) {
    req.session.destroy(() => { })
    res.clearCookie('cadtech.sid')
    return sendError(res, 'Your session expired after an account security change. Sign in again.', 401)
  }

  req.user = User.serializeUser(user)

  next()
}

export default requireAuthentication
