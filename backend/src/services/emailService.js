import nodemailer from 'nodemailer'
import config from '../config/environment.js'

let transporter
let transporterVerificationStarted = false

const getSafeSmtpErrorDetails = (error) => Object.fromEntries(
  ['name', 'code', 'command', 'responseCode', 'response', 'message']
    .filter((field) => error?.[field] !== undefined)
    .map((field) => [field, error[field]])
)

export const getPasswordResetEmailStatus = () => {
  const missing = []
  for (const [name, value] of [
    ['SMTP_HOST', config.smtp_host],
    ['SMTP_PORT', config.smtp_port],
    ['SMTP_SECURE', config.smtp_secure],
    ['SMTP_USER', config.smtp_user],
    ['SMTP_PASSWORD', config.smtp_password],
    ['SMTP_FROM', config.smtp_from],
    ['FRONTEND_URL', config.frontend_url]
  ]) {
    if (typeof value !== 'string' || !value.trim()) missing.push(name)
  }

  if (config.smtp_port && (!Number.isInteger(Number(config.smtp_port)) || Number(config.smtp_port) < 1 || Number(config.smtp_port) > 65535)) {
    missing.push('SMTP_PORT')
  }
  if (config.smtp_secure && !['true', 'false'].includes(String(config.smtp_secure).toLowerCase())) missing.push('SMTP_SECURE')
  if (config.smtp_user && !config.smtp_password) missing.push('SMTP_PASSWORD')
  if (config.smtp_password && !config.smtp_user) missing.push('SMTP_USER')

  let frontendUrlIsValid = false
  try {
    const url = new URL(config.frontend_url)
    frontendUrlIsValid = ['http:', 'https:'].includes(url.protocol)
  } catch {
    frontendUrlIsValid = false
  }
  if (config.frontend_url && !frontendUrlIsValid) missing.push('FRONTEND_URL')

  const uniqueMissing = [...new Set(missing)]
  return { configured: uniqueMissing.length === 0, missing: uniqueMissing }
}

function getTransporter() {
  if (!getPasswordResetEmailStatus().configured) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: Number(config.smtp_port),
      secure: String(config.smtp_secure).toLowerCase() === 'true',
      auth: { user: config.smtp_user, pass: config.smtp_password }
    })
  }

  if (!transporterVerificationStarted) {
    transporterVerificationStarted = true
    void transporter.verify()
      .then(() => console.info('[Email] SMTP connection verified'))
      .catch((error) => {
        console.error('[Email] SMTP connection verification failed', getSafeSmtpErrorDetails(error))
      })
  }

  return transporter
}

export const sendPasswordResetEmail = async (email, resetUrl) => {
  try {
    const mailer = getTransporter()
    if (!mailer) {
      const { missing } = getPasswordResetEmailStatus()
      console.error(`[Email] Password reset delivery is unavailable. Configure: ${missing.join(', ')}.`)
      return false
    }

    await mailer.sendMail({
      from: config.smtp_from,
      to: email,
      subject: 'Reset your CadTech Solution password',
      text: `We received a request to reset your CadTech Solution password. Use the secure link below within 30 minutes. The link can only be used once.\n\n${resetUrl}\n\nIf you did not request this change, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><h1 style="font-size:22px">Reset your password</h1><p>We received a request to reset your CadTech Solution password.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p><p>This secure link expires in 30 minutes and can only be used once.</p><p>If you did not request this change, you can ignore this email.</p></div>`
    })
  } catch (error) {
    console.error('[Email] Password reset delivery failed.', getSafeSmtpErrorDetails(error))
    return false
  }
  return true
}

export const sendLoginOtpEmail = async (email, otp) => {
  try {
    const mailer = getTransporter()
    if (!mailer) {
      const { missing } = getPasswordResetEmailStatus()
      console.error(`[Email] Login OTP delivery is unavailable. Configure: ${missing.join(', ')}.`)
      return false
    }
    await mailer.sendMail({
      from: config.smtp_from,
      to: email,
      subject: 'Your CadTech Solution sign-in code',
      text: `Your sign-in code is ${otp}. It expires in ${config.login_otp_ttl_minutes} minutes. If you did not request this code, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><h1 style="font-size:22px">Your sign-in code</h1><p>Enter this code to sign in to CadTech Solution:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p><p>This code expires soon and can only be used once.</p><p>If you did not request this code, you can ignore this email.</p></div>`
    })
    return true
  } catch (error) {
    console.error('[Email] Login OTP delivery failed.', getSafeSmtpErrorDetails(error))
    return false
  }
}

export const sendVerificationEmail = async (email, verificationUrl) => {
  try {
    const mailer = getTransporter()
    if (!mailer) {
      const { missing } = getPasswordResetEmailStatus()
      console.error(`[Email] Email verification delivery is unavailable. Configure: ${missing.join(', ')}.`)
      return false
    }
    await mailer.sendMail({
      from: config.smtp_from,
      to: email,
      subject: 'Verify your CadTech Solution email',
      text: `Verify your CadTech Solution email address using this link within ${config.email_verification_ttl_hours} hours:\n\n${verificationUrl}\n\nIf you did not create this account, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><h1 style="font-size:22px">Verify your email</h1><p>Confirm your email address to finish creating your CadTech Solution account.</p><p><a href="${verificationUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Verify email</a></p><p>This link expires in ${config.email_verification_ttl_hours} hours and can only be used once.</p></div>`
    })
    return true
  } catch (error) {
    console.error('[Email] Email verification delivery failed.', getSafeSmtpErrorDetails(error))
    return false
  }
}

if (config.node_env === 'production') getTransporter()

export default { getPasswordResetEmailStatus, sendPasswordResetEmail, sendLoginOtpEmail, sendVerificationEmail }