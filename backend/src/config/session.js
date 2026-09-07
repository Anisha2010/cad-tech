/**
 * Session configuration
 * Configures express-session with secure cookie settings
 */
import session from 'express-session'
import config from './environment.js'

const sessionConfig = {
  name: 'cadtech.sid',
  secret: config.session_secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.node_env === 'production',
    maxAge: config.session_lifetime_ms
  }
}

export const createSessionMiddleware = () => session(sessionConfig)

export default sessionConfig
