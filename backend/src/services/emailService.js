import dns from 'node:dns'
import net from 'node:net'
import nodemailer from 'nodemailer'
import config from '../config/environment.js'
import emailProvider, { mockEmailProvider } from './emailProvider.js'

const createIpv4Socket = (host, port, callback) => {
  dns.resolve4(host, (error, addresses) => {
    if (error) return callback(error)
    if (!addresses.length) return callback(new Error(`No IPv4 addresses found for ${host}`))

    const socket = net.connect({ host: addresses[0], port, family: 4 }, () => callback(null, { connection: socket }))
    socket.once('error', (socketError) => {
      if (!socket.destroyed) socket.destroy()
      callback(socketError)
    })
  })
}

export const getSmtpFailureCategory = (error) => {
  const code = String(error?.code || '').toUpperCase()
  const message = String(error?.message || '').toLowerCase()
  if (['EDNS', 'EAI_AGAIN', 'ENOTFOUND'].includes(code)) return 'DNS failure'
  if (['ECONNREFUSED', 'ENETUNREACH', 'ETIMEDOUT', 'ESOCKET'].includes(code)) return 'TCP connection failure'
  if (code === 'ETLS') return 'TLS/STARTTLS failure'
  if (['EAUTH', '535', '534'].includes(code) || message.includes('authentication')) return 'SMTP authentication failure'
  if (code === 'EENVELOPE' || message.includes('sender')) return 'sender rejection'
  if (message.includes('recipient')) return 'recipient rejection'
  return 'application-side failure'
}

export const getSafeSmtpErrorDetails = (error) => ({
  provider: 'smtp',
  category: getSmtpFailureCategory(error),
  ...(typeof error?.code === 'string' ? { code: error.code } : {}),
  ...(typeof error?.responseCode === 'number' ? { status: error.responseCode } : {})
})

const getPasswordResetEmailStatusFor = (configuration) => {
  const missing = [...(configuration.email_configuration?.missing || [])]
  if (!configuration.frontend_url?.trim()) missing.push('FRONTEND_URL')

  let frontendUrlIsValid = false
  try {
    const url = new URL(configuration.frontend_url)
    frontendUrlIsValid = ['http:', 'https:'].includes(url.protocol)
  } catch {
    frontendUrlIsValid = false
  }
  if (configuration.frontend_url && !frontendUrlIsValid) missing.push('FRONTEND_URL')
  if (configuration.email_provider === 'mock' && !['development', 'test'].includes(configuration.node_env)) {
    missing.push('EMAIL_PROVIDER')
  }

  const uniqueMissing = [...new Set(missing)]
  return { configured: uniqueMissing.length === 0, missing: uniqueMissing }
}

export const createEmailService = ({
  configuration = config,
  resendProvider = emailProvider,
  mockProvider = mockEmailProvider,
  createTransport = nodemailer.createTransport,
  logger = console
} = {}) => {
  let transporter
  let transporterVerificationStarted = false

  const getTransporter = () => {
    if (configuration.email_provider !== 'smtp' || !getPasswordResetEmailStatusFor(configuration).configured) return null
    if (!transporter) {
      transporter = createTransport({
        host: configuration.smtp_host,
        port: Number(configuration.smtp_port),
        secure: String(configuration.smtp_secure).toLowerCase() === 'true',
        auth: { user: configuration.smtp_user, pass: configuration.smtp_password },
        getSocket: (options, callback) => createIpv4Socket(options.host, options.port, callback)
      })
    }

    if (!transporterVerificationStarted) {
      transporterVerificationStarted = true
      void transporter.verify()
        .then(() => logger.info('[Email] SMTP connection verified successfully'))
        .catch((error) => logger.error('[Email] SMTP connection verification failed.', getSafeSmtpErrorDetails(error)))
    }

    return transporter
  }

  const sendWithConfiguredProvider = async ({ to, subject, text, html, operation }) => {
    if (configuration.email_provider === 'resend') {
      return resendProvider.send({ to, subject, text, html, operation })
    }
    if (configuration.email_provider === 'mock') {
      if (!['development', 'test'].includes(configuration.node_env)) return false
      return mockProvider.send({
        from: configuration.email_from,
        to,
        subject,
        text,
        html,
        operation
      })
    }

    const mailer = getTransporter()
    if (!mailer) {
      const { missing } = getPasswordResetEmailStatusFor(configuration)
      logger.error(`[Email] Delivery is unavailable. Configure: ${missing.join(', ')}.`)
      return false
    }

    const info = await mailer.sendMail({ from: configuration.email_from, to, subject, text, html })
    const accepted = Array.isArray(info?.accepted) ? info.accepted.length : 0
    const rejected = Array.isArray(info?.rejected) ? info.rejected.length : 0
    if (accepted === 0 || rejected > 0) {
      logger.error('[Email] SMTP provider did not accept the message.', {
        provider: 'smtp',
        operation,
        accepted,
        rejected
      })
      return false
    }
    logger.info('[Email] SMTP provider accepted message.', {
      provider: 'smtp',
      operation,
      accepted,
      rejected
    })
    return info
  }

  const sendPasswordResetEmail = async (email, resetUrl) => {
    try {
      return await sendWithConfiguredProvider({
        operation: 'password_reset',
        to: email,
        subject: 'Reset your CadTech Solution password',
        text: `We received a request to reset your CadTech Solution password. Use the secure link below within 30 minutes. The link can only be used once.\n\n${resetUrl}\n\nIf you did not request this change, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><h1 style="font-size:22px">Reset your password</h1><p>We received a request to reset your CadTech Solution password.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p><p>This secure link expires in 30 minutes and can only be used once.</p><p>If you did not request this change, you can ignore this email.</p></div>`
      })
    } catch (error) {
      logger.error('[Email] Password reset delivery failed.', {
        provider: configuration.email_provider,
        operation: 'password_reset',
        ...(configuration.email_provider === 'smtp'
          ? getSafeSmtpErrorDetails(error)
          : typeof error?.code === 'string' ? { code: error.code } : {})
      })
      return false
    }
  }

  const sendLoginOtpEmail = async (email, otp) => {
    try {
      return await sendWithConfiguredProvider({
        operation: 'login_otp',
        to: email,
        subject: 'Your CadTech Solution sign-in code',
        text: `Your sign-in code is ${otp}. It expires in ${configuration.login_otp_ttl_minutes} minutes. If you did not request this code, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><h1 style="font-size:22px">Your sign-in code</h1><p>Enter this code to sign in to CadTech Solution:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p><p>This code expires soon and can only be used once.</p><p>If you did not request this code, you can ignore this email.</p></div>`
      })
    } catch (error) {
      logger.error('[Email] Login OTP delivery failed.', {
        provider: configuration.email_provider,
        operation: 'login_otp',
        ...(configuration.email_provider === 'smtp'
          ? getSafeSmtpErrorDetails(error)
          : typeof error?.code === 'string' ? { code: error.code } : {})
      })
      return false
    }
  }

  const sendVerificationEmail = async (email, verificationUrl) => {
    try {
      return await sendWithConfiguredProvider({
        operation: 'email_verification',
        to: email,
        subject: 'Verify your CadTech Solution email',
        text: `Verify your CadTech Solution email address using this link within ${configuration.email_verification_ttl_hours} hours:\n\n${verificationUrl}\n\nIf you did not create this account, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><h1 style="font-size:22px">Verify your email</h1><p>Confirm your email address to finish creating your CadTech Solution account.</p><p><a href="${verificationUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Verify email</a></p><p>This link expires in ${configuration.email_verification_ttl_hours} hours and can only be used once.</p></div>`
      })
    } catch (error) {
      logger.error('[Email] Email verification delivery failed.', {
        provider: configuration.email_provider,
        operation: 'email_verification',
        ...(configuration.email_provider === 'smtp'
          ? getSafeSmtpErrorDetails(error)
          : typeof error?.code === 'string' ? { code: error.code } : {})
      })
      return false
    }
  }

  return {
    getPasswordResetEmailStatus: () => getPasswordResetEmailStatusFor(configuration),
    verifySmtpConnection: () => getTransporter(),
    sendPasswordResetEmail,
    sendLoginOtpEmail,
    sendVerificationEmail
  }
}

const emailService = createEmailService()
export const getPasswordResetEmailStatus = emailService.getPasswordResetEmailStatus
export const sendPasswordResetEmail = emailService.sendPasswordResetEmail
export const sendLoginOtpEmail = emailService.sendLoginOtpEmail
export const sendVerificationEmail = emailService.sendVerificationEmail

if (config.node_env === 'production' && config.email_provider === 'smtp') {
  emailService.verifySmtpConnection()
}

export default { ...emailService, createEmailService }
