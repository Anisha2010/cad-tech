import { normalizeEmail } from '../models/User.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^[0-9]{10}$/
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{12,64}$/
const profileFields = new Set(['name', 'email', 'phone', 'avatarUrl'])
const isStrongPassword = (password) => typeof password === 'string' && strongPasswordPattern.test(password) && Buffer.byteLength(password, 'utf8') <= 72

export const validateEmailRequest = (data) => {
  const errors = {}
  if (typeof data.email !== 'string' || !emailPattern.test(normalizeEmail(data.email))) errors.email = 'Please enter a valid email address.'
  return { isValid: Object.keys(errors).length === 0, errors }
}

export const validatePasswordReset = (data) => {
  const errors = {}
  if (typeof data.token !== 'string' || data.token.length < 32 || data.token.length > 256) errors.token = 'This reset link is invalid or has expired.'
  if (!isStrongPassword(data.password)) errors.password = 'Use 12 to 64 characters with uppercase, lowercase, number, and symbol.'
  if (data.confirmPassword !== data.password) errors.confirmPassword = 'Passwords do not match.'
  return { isValid: Object.keys(errors).length === 0, errors }
}

export const validateProfileUpdate = (data) => {
  const errors = {}
  const unknownFields = Object.keys(data).filter((field) => !profileFields.has(field))
  for (const field of unknownFields) errors[field] = 'This field cannot be updated.'

  if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.trim().length > 100) errors.name = 'Name must be between 2 and 100 characters.'
  if (typeof data.email !== 'string' || !emailPattern.test(normalizeEmail(data.email)) || normalizeEmail(data.email).length > 254) errors.email = 'Please enter a valid email address.'

  if (Object.hasOwn(data, 'phone') && data.phone !== null && data.phone !== '' && (typeof data.phone !== 'string' || !phonePattern.test(data.phone.replace(/\D/g, '')))) {
    errors.phone = 'Please enter a valid 10-digit phone number.'
  }

  if (Object.hasOwn(data, 'avatarUrl') && data.avatarUrl !== null && data.avatarUrl !== '') {
    try {
      if (typeof data.avatarUrl !== 'string' || data.avatarUrl.length > 2048) throw new Error('Invalid avatar URL')
      const url = new URL(data.avatarUrl)
      if (!['https:', 'http:'].includes(url.protocol)) errors.avatarUrl = 'Please provide a valid image URL.'
    } catch {
      errors.avatarUrl = 'Please provide a valid image URL.'
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors }
}

export const validatePasswordChange = (data) => {
  const errors = {}
  if (typeof data.currentPassword !== 'string' || !data.currentPassword) errors.currentPassword = 'Current password is required.'
  if (!isStrongPassword(data.password)) errors.password = 'Use 12 to 64 characters with uppercase, lowercase, number, and symbol.'
  if (data.confirmPassword !== data.password) errors.confirmPassword = 'Passwords do not match.'
  if (data.currentPassword && data.password && data.currentPassword === data.password) errors.password = 'Choose a password different from your current password.'
  return { isValid: Object.keys(errors).length === 0, errors }
}