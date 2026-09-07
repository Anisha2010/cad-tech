/**
 * Standardized response formatting
 */
export const sendSuccess = (res, data = null, message = 'Request completed successfully.', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  })
}

export const sendError = (res, message = 'An error occurred.', statusCode = 500, fieldErrors = null) => {
  const response = {
    success: false,
    message
  }

  if (fieldErrors) {
    response.fieldErrors = fieldErrors
  }

  res.status(statusCode).json(response)
}

export default { sendSuccess, sendError }
