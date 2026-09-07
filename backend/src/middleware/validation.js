/**
 * Validation middleware
 * Processes validation results and returns appropriate error responses
 */
import { sendError } from '../utils/response.js'

/**
 * Middleware: Handle validation results
 * Expects validator to attach validation result to request
 */
export const handleValidationResult = (req, res, next) => {
  if (req.validation && !req.validation.isValid) {
    return sendError(res, 'Validation failed.', 400, req.validation.errors)
  }

  next()
}

/**
 * Factory function to create validation middleware
 * @param {Function} validatorFn - Validation function that returns {isValid, errors}
 * @param {Function} dataExtractor - Function to extract data from request
 * @returns {Function} Express middleware function
 */
export const validateRequest = (validatorFn, dataExtractor = (req) => req.body) => {
  return (req, res, next) => {
    const data = dataExtractor(req)
    req.validation = validatorFn(data)
    next()
  }
}

export default {
  handleValidationResult,
  validateRequest
}
