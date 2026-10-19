/**
 * Centralized error handling middleware
 * Catches all errors and returns consistent JSON responses
 * Never exposes sensitive information in production
 */

import { AppError } from '../utils/AppError.js'

const safeDuplicateKeyDetails = (error) => {
  const details = {}
  const fields = error?.keyPattern && typeof error.keyPattern === 'object'
    ? Object.keys(error.keyPattern)
      .filter((field) => /^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(field))
      .slice(0, 16)
    : []
  if (fields.length) details.duplicateKeyFields = fields

  const suppliedIndexName = typeof error?.indexName === 'string'
    ? error.indexName
    : (typeof error?.index === 'string' ? error.index : null)
  const messageIndexName = typeof error?.message === 'string'
    ? error.message.match(/\bindex:\s*([A-Za-z0-9_.$-]{1,127})\s+dup key:/)?.[1]
    : null
  const indexName = suppliedIndexName || messageIndexName
  if (indexName && /^[A-Za-z0-9_.$-]{1,127}$/.test(indexName)) {
    details.duplicateKeyIndex = indexName
  }
  return details
}

const duplicateKeyMessage = (error) => {
  const fields = error?.keyPattern && typeof error.keyPattern === 'object'
    ? Object.keys(error.keyPattern)
    : []
  if (fields.includes('providerOrderId') || fields.includes('providerPaymentId')) {
    return 'This payment has already been recorded.'
  }
  if (fields.includes('email')) return 'An account with this email already exists.'
  return 'A conflicting record already exists.'
}

export const errorHandlerMiddleware = (err, req, res, next) => {
  const isApplicationError = err instanceof AppError
  const isDuplicateKeyError = err?.code === 11000
  const isCorsOriginRejection = err?.code === 'CORS_ORIGIN_REJECTED'
  const statusCode = isCorsOriginRejection ? 403 : (isDuplicateKeyError ? 409 : (isApplicationError ? err.statusCode : 500))
  const message = isDuplicateKeyError
    ? duplicateKeyMessage(err)
    : isCorsOriginRejection
      ? 'Origin is not allowed by the E2E CORS policy.'
      : isApplicationError
        ? err.message
        : 'An internal server error occurred.'

  const route = typeof req?.route?.path === 'string' ? req.route.path : 'unmatched'
  const method = typeof req?.method === 'string' && /^[A-Z]{1,12}$/.test(req.method) ? req.method : 'UNKNOWN'
  const category = isDuplicateKeyError
    ? 'DUPLICATE_KEY'
    : isCorsOriginRejection
      ? 'CORS_ORIGIN_REJECTED'
      : isApplicationError
        ? 'APPLICATION_ERROR'
        : 'UNHANDLED_ERROR'
  const errorName = typeof err?.name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(err.name)
    ? err.name
    : 'Error'
  const logDetails = { statusCode, method, route, category, errorName }
  if (Number.isSafeInteger(err?.code)) logDetails.errorCode = err.code
  if (isDuplicateKeyError) Object.assign(logDetails, safeDuplicateKeyDetails(err))
  console.error('[Request error]', logDetails)

  const response = {
    success: false,
    message
  }
  if (isApplicationError && err.code) response.code = err.code
  if (isApplicationError && err.errors && typeof err.errors === 'object') response.errors = err.errors
  res.status(statusCode).json(response)
}

export default errorHandlerMiddleware
