/**
 * Centralized error handling middleware
 * Catches all errors and returns consistent JSON responses
 * Never exposes sensitive information in production
 */

import { AppError } from '../utils/AppError.js'

export const errorHandlerMiddleware = (err, req, res, next) => {
  const isApplicationError = err instanceof AppError
  const isDuplicateKeyError = err?.code === 11000
  const isCorsOriginRejection = err?.code === 'CORS_ORIGIN_REJECTED'
  const statusCode = isCorsOriginRejection ? 403 : (isDuplicateKeyError ? 409 : (isApplicationError ? err.statusCode : 500))
  const message = isDuplicateKeyError
    ? (err?.keyPattern?.providerOrderId || err?.keyPattern?.providerPaymentId) ? 'This payment has already been recorded.' : 'An account with this email already exists.'
    : isCorsOriginRejection
      ? 'Origin is not allowed by the E2E CORS policy.'
      : isApplicationError
        ? err.message
        : 'An internal server error occurred.'

  console.error(`[Error] ${isApplicationError ? err.message : 'Internal server error'}`, isApplicationError && err.code ? { code: err.code } : {})

  const response = {
    success: false,
    message
  }
  if (isApplicationError && err.code) response.code = err.code
  if (isApplicationError && err.errors && typeof err.errors === 'object') response.errors = err.errors
  res.status(statusCode).json(response)
}

export default errorHandlerMiddleware
