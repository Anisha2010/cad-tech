import crypto from 'node:crypto'
import * as db from '../repositories/userRepository.js'
import * as User from '../models/User.js'
import { getPasswordResetEmailStatus, sendPasswordResetEmail } from './emailService.js'
import config from '../config/environment.js'
import { AppError } from '../utils/AppError.js'

const RESET_TOKEN_LIFETIME_MS = 30 * 60 * 1000
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

export const createAccountService = ({
  repository = db,
  userModel = User,
  emailStatus = getPasswordResetEmailStatus,
  sendResetEmail = sendPasswordResetEmail,
  frontendUrl = config.frontend_url,
  now = () => new Date(),
  generateToken = () => crypto.randomBytes(32).toString('base64url'),
  logger = console
} = {}) => {
  const updateProfile = async (userId, profile) => {
    const email = userModel.normalizeEmail(profile.email)
    const current = await repository.getUserById(userId)
    if (!current) throw new AppError('Authenticated user was not found.', 404)

    if (email !== current.email) {
      const existingUser = await repository.getUserByEmail(email)
      if (existingUser && String(existingUser._id) !== String(current._id)) {
        throw new AppError('An account with this email already exists.', 409, { email: 'This email is already in use.' })
      }
    }

    try {
      const updated = await repository.updateProfile(userId, {
        ...profile,
        name: profile.name.trim(),
        email,
        phone: profile.phone ? profile.phone.replace(/\D/g, '') : null,
        avatarUrl: profile.avatarUrl || null
      })
      if (!updated) throw new AppError('Authenticated user was not found.', 404)
      return updated
    } catch (error) {
      if (error?.code === 11000) throw new AppError('An account with this email already exists.', 409, { email: 'This email is already in use.' })
      throw error
    }
  }

  const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await repository.getUserById(userId, { includePassword: true })
    if (!user?.passwordHash || !await userModel.verifyPassword(currentPassword, user.passwordHash)) {
      throw new AppError('Current password is incorrect.', 400, { currentPassword: 'Current password is incorrect.' })
    }
    await repository.changePassword(userId, await userModel.hashPassword(newPassword))
  }

  const requestPasswordReset = async (email) => {
    const delivery = emailStatus()
    if (!delivery.configured) {
      logger.error(`[Email] Password reset delivery is unavailable. Configure: ${delivery.missing.join(', ')}.`)
      return false
    }

    const user = await repository.getUserByEmail(email)
    if (!user) return true

    const token = generateToken()
    const tokenHash = hashResetToken(token)
    const expiresAt = new Date(now().getTime() + RESET_TOKEN_LIFETIME_MS)
    await repository.setPasswordReset(user._id, tokenHash, expiresAt)

    const resetUrl = `${frontendUrl.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(token)}`
    let sent = false
    try {
      sent = await sendResetEmail(user.email, resetUrl)
    } catch (error) {
      logger.error('[Email] Password reset delivery failed.', { code: typeof error?.code === 'string' ? error.code : 'UNKNOWN' })
    }
    if (!sent) {
      await repository.clearPasswordReset(user._id, tokenHash)
      logger.error('[Email] Password reset token invalidated because delivery failed.')
      return false
    }
    return true
  }

  const isResetTokenValid = async (token) => {
    if (typeof token !== 'string' || token.length < 32 || token.length > 256) return false
    return repository.hasValidPasswordReset(hashResetToken(token), now())
  }

  const resetPassword = async (token, password) => {
    const tokenHash = hashResetToken(token)
    const passwordHash = await userModel.hashPassword(password)
    const user = await repository.consumePasswordReset(tokenHash, passwordHash, now())
    if (!user) throw new AppError('This reset link is invalid or has expired.', 400, { token: 'This reset link is invalid or has expired.' })
  }

  return { updateProfile, changePassword, requestPasswordReset, isResetTokenValid, resetPassword }
}

const accountService = createAccountService()

export const updateProfile = accountService.updateProfile
export const changePassword = accountService.changePassword
export const requestPasswordReset = accountService.requestPasswordReset
export const isResetTokenValid = accountService.isResetTokenValid
export const resetPassword = accountService.resetPassword

export default { ...accountService, createAccountService }