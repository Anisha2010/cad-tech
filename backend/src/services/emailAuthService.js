import crypto from 'node:crypto'
import * as db from '../repositories/userRepository.js'
import config from '../config/environment.js'
import { sendLoginOtpEmail, sendVerificationEmail } from './emailService.js'
import { AppError } from '../utils/AppError.js'

const OTP_LENGTH = 6
const boundedInteger = (value, fallback, minimum, maximum) => Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback
const OTP_MAX_ATTEMPTS = boundedInteger(config.login_otp_max_attempts, 5, 3, 10)
const OTP_TTL_MS = boundedInteger(config.login_otp_ttl_minutes, 10, 5, 30) * 60 * 1000
const VERIFICATION_TTL_MS = boundedInteger(config.email_verification_ttl_hours, 24, 1, 168) * 60 * 60 * 1000
const RESEND_COOLDOWN_MS = boundedInteger(config.auth_email_resend_cooldown_seconds, 60, 30, 300) * 1000

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')
const hashOtp = (email, otp, secret) => crypto.createHmac('sha256', secret).update(`${email}:${otp}`).digest('hex')
const isValidTokenShape = (token) => typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token)

export const createEmailAuthService = ({
  repository = db,
  otpMailer = sendLoginOtpEmail,
  verificationMailer = sendVerificationEmail,
  frontendUrl = config.frontend_url,
  secret = config.session_secret,
  now = () => new Date(),
  generateOtp = () => crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0'),
  generateToken = () => crypto.randomBytes(32).toString('base64url'),
  otpMaxAttempts = OTP_MAX_ATTEMPTS,
  otpTtlMs = OTP_TTL_MS,
  verificationTtlMs = VERIFICATION_TTL_MS,
  resendCooldownMs = RESEND_COOLDOWN_MS,
  logger = console
} = {}) => {
  const requestLoginOtp = async (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const user = await repository.getUserByEmail(normalizedEmail, { includeAuthTokens: true })
    if (!user || user.emailVerified === false) return true

    const currentTime = now()
    const otp = generateOtp()
    const otpHash = hashOtp(normalizedEmail, otp, secret)
    const expiresAt = new Date(currentTime.getTime() + otpTtlMs)
    const cooldownCutoff = new Date(currentTime.getTime() - resendCooldownMs)
    const issued = await repository.issueLoginOtp(user._id || user.id, otpHash, expiresAt, currentTime, cooldownCutoff)
    if (!issued) return true

    try {
      const sent = await otpMailer(user.email, otp)
      if (!sent) await repository.clearLoginOtp(user._id || user.id, otpHash)
    } catch (error) {
      await repository.clearLoginOtp(user._id || user.id, otpHash)
      logger.error('[Auth] Login OTP delivery failed.', { code: typeof error?.code === 'string' ? error.code : 'UNKNOWN' })
    }
    return true
  }

  const verifyLoginOtp = async (email, otp) => {
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const user = await repository.getUserByEmail(normalizedEmail, { includeAuthTokens: true })
    if (!user || user.emailVerified === false || !user.loginOtpHash || !user.loginOtpExpiresAt || user.loginOtpExpiresAt <= now()) {
      if ((user?._id || user?.id) && user.loginOtpHash) await repository.clearLoginOtp(user._id || user.id, user.loginOtpHash)
      throw new AppError('The code is invalid or expired. Request a new code.', 400)
    }

    if (user.loginOtpAttempts >= otpMaxAttempts) {
      throw new AppError('The code is invalid or expired. Request a new code.', 400)
    }

    const candidateHash = hashOtp(normalizedEmail, otp, secret)
    const actual = Buffer.from(user.loginOtpHash, 'hex')
    const candidate = Buffer.from(candidateHash, 'hex')
    const matches = actual.length === candidate.length && crypto.timingSafeEqual(actual, candidate)

    if (!matches) {
      const attempts = await repository.recordLoginOtpFailure(normalizedEmail, user.loginOtpHash, now(), otpMaxAttempts)
      if (attempts >= otpMaxAttempts) throw new AppError('The code is invalid or expired. Request a new code.', 400)
      throw new AppError('The code is invalid or expired. Request a new code.', 400)
    }

    const consumedUser = await repository.consumeLoginOtp(normalizedEmail, candidateHash, now(), otpMaxAttempts)
    if (!consumedUser) throw new AppError('The code is invalid or expired. Request a new code.', 400)
    return consumedUser
  }

  const sendVerificationForUser = async (user, { ignoreCooldown = false } = {}) => {
    if (!user || user.emailVerified === true) return false
    const currentTime = now()
    const token = generateToken()
    const tokenHash = hashToken(token)
    const expiresAt = new Date(currentTime.getTime() + verificationTtlMs)
    const cooldownCutoff = ignoreCooldown ? null : new Date(currentTime.getTime() - resendCooldownMs)
    const userId = user._id || user.id
    const issued = await repository.issueEmailVerification(userId, tokenHash, expiresAt, currentTime, cooldownCutoff)
    if (!issued) return false

    const verificationUrl = `${frontendUrl.replace(/\/+$/, '')}/verify-email?token=${encodeURIComponent(token)}`
    try {
      const sent = await verificationMailer(user.email, verificationUrl)
      if (!sent) await repository.clearEmailVerification(userId, tokenHash)
      return sent
    } catch (error) {
      await repository.clearEmailVerification(userId, tokenHash)
      logger.error('[Auth] Email verification delivery failed.', { code: typeof error?.code === 'string' ? error.code : 'UNKNOWN' })
      return false
    }
  }

  const resendVerificationEmail = async (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const user = await repository.getUserByEmail(normalizedEmail, { includeAuthTokens: true })
    if (user && user.emailVerified !== true) await sendVerificationForUser(user)
    return true
  }

  const verifyEmail = async (token) => {
    if (!isValidTokenShape(token)) throw new AppError('This verification link is invalid or expired. Request a new email.', 400)
    const verifiedUser = await repository.consumeEmailVerification(hashToken(token), now())
    if (!verifiedUser) throw new AppError('This verification link is invalid, expired, or already used.', 400)
    return verifiedUser
  }

  return { requestLoginOtp, verifyLoginOtp, sendVerificationForUser, resendVerificationEmail, verifyEmail }
}

const emailAuthService = createEmailAuthService()

export const requestLoginOtp = emailAuthService.requestLoginOtp
export const verifyLoginOtp = emailAuthService.verifyLoginOtp
export const sendVerificationForUser = emailAuthService.sendVerificationForUser
export const resendVerificationEmail = emailAuthService.resendVerificationEmail
export const verifyEmail = emailAuthService.verifyEmail

export default { ...emailAuthService, createEmailAuthService }
