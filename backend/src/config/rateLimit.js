import rateLimit from 'express-rate-limit'

export const createApiLimiter = () => rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this client. Please try again later.'
  }
})

export const createAuthLimiter = () => rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  }
})

export const createOtpRequestLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'If the account is eligible, a code will be sent. Please wait before trying again.' }
})

export const createOtpVerifyLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many code attempts. Please try again later.' }
})

export const createVerificationResendLimiter = () => rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'If the account needs verification, an email will be sent. Please wait before trying again.' }
})

export const createQuizStartLimiter = () => rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many quiz start requests. Please try again shortly.' }
})

export const createQuizAnswerLimiter = () => rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many answer saves. Please wait a moment and try again.' }
})

export const createQuizSubmitLimiter = () => rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many quiz submission requests. Please retry shortly.' }
})

export default { createApiLimiter, createAuthLimiter, createOtpRequestLimiter, createOtpVerifyLimiter, createVerificationResendLimiter, createQuizStartLimiter, createQuizAnswerLimiter, createQuizSubmitLimiter }
