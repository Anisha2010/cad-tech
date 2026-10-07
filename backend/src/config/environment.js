/**
 * Environment configuration
 * Validates that required environment variables are present
 */
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const readIntegerSetting = (name, fallback, minimum, maximum) => {
  const value = Number(process.env[name])
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback
}

const loadEnvironment = () => {
  if (process.env.E2E_MODE === 'true') return
  const envPath = path.join(__dirname, '../../.env')
  const result = dotenv.config({ path: envPath })
  if (result.error) {
    console.warn('[Env] Local .env file not found. Using process environment values only.')
  }
}

loadEnvironment()

const config = {
  node_env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  frontend_url: process.env.FRONTEND_URL || '',
  smtp_host: process.env.SMTP_HOST || '',
  smtp_port: process.env.SMTP_PORT || '',
  smtp_secure: process.env.SMTP_SECURE || '',
  smtp_user: process.env.SMTP_USER || '',
  smtp_password: process.env.SMTP_PASSWORD || '',
  smtp_from: process.env.SMTP_FROM || '',
  email_provider: process.env.EMAIL_PROVIDER || 'smtp',
  resend_api_key: process.env.RESEND_API_KEY || '',
  resend_from: process.env.RESEND_FROM || '',
  login_otp_ttl_minutes: readIntegerSetting('LOGIN_OTP_TTL_MINUTES', 10, 5, 30),
  login_otp_max_attempts: readIntegerSetting('LOGIN_OTP_MAX_ATTEMPTS', 5, 3, 10),
  email_verification_ttl_hours: readIntegerSetting('EMAIL_VERIFICATION_TTL_HOURS', 24, 1, 168),
  auth_email_resend_cooldown_seconds: readIntegerSetting('AUTH_EMAIL_RESEND_COOLDOWN_SECONDS', 60, 30, 300),
  session_secret: process.env.SESSION_SECRET || '',
  mongodb_uri: process.env.MONGODB_URI || '',
  session_lifetime_ms: 1000 * 60 * 60 * 8,
  razorpay_key_id: process.env.RAZORPAY_KEY_ID || '',
  razorpay_key_secret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpay_webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY || '',
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET || '',
  assignment_upload_max_bytes: Number(process.env.ASSIGNMENT_UPLOAD_MAX_BYTES || 10485760),

  // Google OAuth
  google_client_id: process.env.GOOGLE_CLIENT_ID || '',
  google_client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
  google_callback_url: process.env.GOOGLE_CALLBACK_URL || '',

  // GitHub OAuth
  github_client_id: process.env.GITHUB_CLIENT_ID || '',
  github_client_secret: process.env.GITHUB_CLIENT_SECRET || '',
  github_callback_url: process.env.GITHUB_CALLBACK_URL || ''
}

// Validate essential config
if (!config.session_secret || config.session_secret === 'cadtech-dev-secret') {
  if (config.node_env === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production')
  }

  config.session_secret = config.session_secret || 'cadtech-dev-secret'
}

if (!config.mongodb_uri && config.node_env === 'production') {
  throw new Error('MONGODB_URI environment variable is required in production')
}

export default config
