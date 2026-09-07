/**
 * 404 Not Found middleware
 * Handles unknown routes with JSON response
 */
import { sendError } from '../utils/response.js'

export const notFoundMiddleware = (req, res) => {
  sendError(res, `Cannot ${req.method} ${req.originalUrl}`, 404)
}

export default notFoundMiddleware
