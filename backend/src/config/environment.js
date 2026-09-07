/**
 * Environment configuration
 * Validates that required environment variables are present
 */
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') })

const config = {
  node_env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  frontend_url: process.env.FRONTEND_URL || 'http://localhost:5173',
  session_secret: process.env.SESSION_SECRET || 'cadtech-dev-secret',
  session_lifetime_ms: 1000 * 60 * 60 * 8,
  razorpay_key_id: process.env.RAZORPAY_KEY_ID || '',
  razorpay_key_secret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpay_webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET || '',

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
}

export default config
