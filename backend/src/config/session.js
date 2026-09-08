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
    secure: config.node_env === 'production',
    sameSite: config.node_env === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}

export const createSessionMiddleware = () => session(sessionConfig)

export default sessionConfig
