/**
 * Auth validation rules
 * Validates registration and login requests
 */
import { normalizeEmail } from '../models/User.js'

/**
 * Validate registration input
 */
export const validateRegistration = (data) => {
  const errors = {}

  // Name validation
  if (!data.name || typeof data.name !== 'string') {
    errors.name = 'Name is required.'
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  }

  // Email validation
  if (!data.email || typeof data.email !== 'string') {
    errors.email = 'Email is required.'
  } else {
    const email = normalizeEmail(data.email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address.'
    }
  }

  // Phone validation (optional)
  if (data.phone && typeof data.phone === 'string') {
    const phoneRegex = /^[0-9]{10}$/
    if (!phoneRegex.test(data.phone.replace(/\D/g, ''))) {
      errors.phone = 'Please enter a valid 10-digit phone number.'
    }
  }

  // Role validation
  if (!data.role || typeof data.role !== 'string') {
    errors.role = 'Role is required.'
  } else if (data.role.toLowerCase() === 'admin') {
    errors.role = 'This account type cannot be created through public registration.'
  } else if (!['student', 'instructor'].includes(data.role.toLowerCase())) {
    errors.role = 'Role must be either student or instructor.'
  }

  // Password validation
  if (!data.password || typeof data.password !== 'string') {
    errors.password = 'Password is required.'
  } else if (!isValidPassword(data.password)) {
    errors.password = 'Use 12 to 64 characters with uppercase, lowercase, number, and symbol.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const isValidPassword = (password) => typeof password === 'string'
  && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{12,64}$/.test(password)
  && Buffer.byteLength(password, 'utf8') <= 72

/**
 * Validate login input
 */
export const validateLogin = (data) => {
  const errors = {}

  // Email validation
  if (!data.email || typeof data.email !== 'string') {
    errors.email = 'Email is required.'
  } else {
    const email = normalizeEmail(data.email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address.'
    }
  }

  // Password validation
  if (!data.password || typeof data.password !== 'string') {
    errors.password = 'Password is required.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validateOtpRequest = (data) => validateEmailRequestShape(data)

export const validateOtpLogin = (data) => {
  const { errors } = validateEmailRequestShape(data)
  if (typeof data.otp !== 'string' || !/^\d{6}$/.test(data.otp)) errors.otp = 'Enter the 6-digit code from your email.'
  return { isValid: Object.keys(errors).length === 0, errors }
}

export const validateEmailVerification = (data) => {
  const errors = {}
  if (typeof data.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(data.token)) errors.token = 'This verification link is invalid or expired.'
  return { isValid: Object.keys(errors).length === 0, errors }
}

function validateEmailRequestShape(data) {
  const errors = {}
  if (typeof data.email !== 'string' || !data.email.trim()) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(data.email))) errors.email = 'Please enter a valid email address.'
  return { isValid: Object.keys(errors).length === 0, errors }
}

export default {
  validateRegistration,
  validateLogin,
  validateOtpRequest,
  validateOtpLogin,
  validateEmailVerification
}
