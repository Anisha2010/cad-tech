/**
 * Custom error class for application errors
 * Ensures consistent error handling and response formatting
 */
export class AppError extends Error {
  constructor(message, statusCode, errors = null, code = null) {
    super(message)
    this.statusCode = statusCode
    this.errors = errors
    this.code = code

    Error.captureStackTrace(this, this.constructor)
  }
}

export default AppError
