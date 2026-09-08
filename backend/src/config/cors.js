/**
 * CORS configuration
 * Secures cross-origin requests with appropriate allowed origins
 */
import config from './environment.js'

const corsConfig = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}

export default corsConfig
