/**
 * Centralized error handling middleware
 * Catches all errors and returns consistent JSON responses
 * Never exposes sensitive information in production
 */
import { AppError } from '../utils/AppError.js'

export const errorHandlerMiddleware = (err, req, res, next) => {
  // Determine status code
  const statusCode = err.statusCode || 500

  // Log error (but never log sensitive data)
  console.error(`[Error] ${err.message}`)

  // In production, never expose stack trace or internal details
  const isDevelopment = process.env.NODE_ENV !== 'production'

  // Return error response
  const response = {
    success: false,
    message: err.message || 'An error occurred.'
  }

  // In development, include stack trace for debugging
  if (isDevelopment && err.stack) {
    response.stack = err.stack
  }

  res.status(statusCode).json(response)
}

export default errorHandlerMiddleware
