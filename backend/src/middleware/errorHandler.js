/**
 * Centralized error handling middleware
 * Catches all errors and returns consistent JSON responses
 * Never exposes sensitive information in production
 */

import { AppError } from '../utils/AppError.js'

export const errorHandlerMiddleware = (err, req, res, next) => {
  const isApplicationError = err instanceof AppError
  const isDuplicateKeyError = err?.code === 11000
  const statusCode = isDuplicateKeyError ? 409 : (isApplicationError ? err.statusCode : 500)
  const message = isDuplicateKeyError
    ? (err?.keyPattern?.providerOrderId || err?.keyPattern?.providerPaymentId) ? 'This payment has already been recorded.' : 'An account with this email already exists.'
    : isApplicationError
      ? err.message
      : 'An internal server error occurred.'

  console.error(`[Error] ${isApplicationError ? err.message : 'Internal server error'}`)

  res.status(statusCode).json({
    success: false,
    message
  })
}

export default errorHandlerMiddleware
