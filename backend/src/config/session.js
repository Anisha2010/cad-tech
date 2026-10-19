/**
 * Session configuration
 * Configures express-session with secure cookie settings
 */
import session from 'express-session'
import MongoStore from 'connect-mongo'
import mongoose from 'mongoose'
import config from './environment.js'
import { getSafeMongoErrorDetails } from '../utils/safeMongoErrorDetails.js'

let sessionStore
let sessionMiddleware

const createSessionStore = () => {
  if (config.node_env === 'test') return undefined
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB must be connected before the session store is initialized.')
  }

  sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: 'sessions',
    ttl: Math.ceil(config.session_lifetime_ms / 1000),
    touchAfter: 24 * 60 * 60
  })
  sessionStore.collectionP?.catch((error) => {
    console.error('[Database] MongoDB session-store initialization failed.', {
      database: config.mongodb_database || 'unconfigured',
      environment: config.environment_label,
      ...getSafeMongoErrorDetails(error)
    })
  })
  sessionStore.on('error', (error) => {
    console.error('[Database] MongoDB session-store error.', {
      database: config.mongodb_database || 'unconfigured',
      environment: config.environment_label,
      ...getSafeMongoErrorDetails(error)
    })
  })
  return sessionStore
}

export const createSessionMiddleware = () => {
  if (!sessionMiddleware) {
    sessionMiddleware = session({
      name: 'cadtech.sid',
      secret: config.session_secret,
      ...(config.node_env === 'test' ? {} : { store: createSessionStore() }),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: config.node_env === 'production',
        sameSite: config.node_env === 'production' ? 'none' : 'lax',
        maxAge: config.session_lifetime_ms
      }
    })
  }
  return sessionMiddleware
}

export const closeSessionStore = async () => {
  if (sessionStore) {
    const store = sessionStore
    sessionStore = undefined
    sessionMiddleware = undefined
    // The store shares mongoose's client; closing it here would tear down
    // checked-out mongoose connections mid-flight. disconnectDatabase()
    // closes the shared client. Attach a catch so a late TTL-index
    // rejection cannot crash the process.
    store.collectionP?.catch(() => {})
  }
}

export default { createSessionMiddleware, closeSessionStore }
