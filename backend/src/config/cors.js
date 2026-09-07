/**
 * CORS configuration
 * Secures cross-origin requests with appropriate allowed origins
 */
import config from './environment.js'

const corsConfig = {
  origin: config.frontend_url,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}

export default corsConfig
