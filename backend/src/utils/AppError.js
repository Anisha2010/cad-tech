/**
 * Custom error class for application errors
 * Ensures consistent error handling and response formatting
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode

    Error.captureStackTrace(this, this.constructor)
  }
}

export default AppError
