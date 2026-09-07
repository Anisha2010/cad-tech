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
  } else if (!['student', 'instructor'].includes(data.role)) {
    errors.role = 'Role must be either student or instructor.'
  }

  // Password validation
  if (!data.password || typeof data.password !== 'string') {
    errors.password = 'Password is required.'
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

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

export default {
  validateRegistration,
  validateLogin
}
