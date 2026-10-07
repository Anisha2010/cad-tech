/**
 * CORS configuration
 * Allows local frontend development while keeping credentials enabled
 */
import config from './environment.js'

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

  const configuredOrigin = process.env.FRONTEND_URL || config.frontend_url
  if (process.env.E2E_MODE === 'true') {
    return origin === 'http://127.0.0.1:5173' ? origin : false
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

    callback(null, process.env.FRONTEND_URL || config.frontend_url || 'http://localhost:5173')
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  optionsSuccessStatus: 204
}

export default corsConfig
