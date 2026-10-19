/**
 * CORS configuration
 * Allows local frontend development while keeping credentials enabled
 */
import config from './environment.js'
import { normalizeFrontendOrigin } from '../utils/emailVerificationUrl.js'

const allowedLocalOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:4173'
])

const resolveAllowedOrigin = (origin) => {
  if (!origin) return true
  if (process.env.E2E_MODE === 'true') {
    return ['http://127.0.0.1:5173', 'http://localhost:5173'].includes(origin) ? origin : false
  }

  let configuredOrigin = ''
  try {
    configuredOrigin = normalizeFrontendOrigin(process.env.FRONTEND_URL || config.frontend_url, {
      production: config.node_env === 'production'
    })
  } catch {
    return false
  }

  if (configuredOrigin && origin === configuredOrigin) return configuredOrigin

  if (config.node_env !== 'production' && allowedLocalOrigins.has(origin)) {
    return origin
  }

  return false
}

const corsConfig = {
  origin: (origin, callback) => {
    const allowedOrigin = resolveAllowedOrigin(origin)
    if (allowedOrigin) {
      callback(null, allowedOrigin)
      return
    }

    if (process.env.E2E_MODE === 'true') {
      const error = new Error('Origin is not allowed by the E2E CORS policy.')
      error.statusCode = 403
      error.code = 'CORS_ORIGIN_REJECTED'
      callback(error)
      return
    }

    callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Idempotency-Key'],
  optionsSuccessStatus: 204
}

export default corsConfig
