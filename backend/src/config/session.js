/**
 * Session configuration
 * Configures express-session with secure cookie settings
 */
import session from 'express-session'
import MongoStore from 'connect-mongo'
import config from './environment.js'

const sessionStore = MongoStore.create({
  mongoUrl: config.mongodb_uri || (() => { throw new Error('MONGODB_URI environment variable is required for sessions') })(),
  collectionName: 'sessions',
  ttl: Math.ceil(config.session_lifetime_ms / 1000),
  touchAfter: 24 * 60 * 60
})

sessionStore.on('error', () => console.error('Session store error'))

const sessionConfig = {
  name: 'cadtech.sid',
  secret: config.session_secret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.node_env === 'production',
    sameSite: config.node_env === 'production' ? 'none' : 'lax',
    maxAge: config.session_lifetime_ms
  }
}

export const createSessionMiddleware = () => session(sessionConfig)

export default sessionConfig
