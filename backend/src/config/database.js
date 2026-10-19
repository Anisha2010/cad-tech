import mongoose from 'mongoose'
import config from './environment.js'
import { getSafeMongoErrorDetails } from '../utils/safeMongoErrorDetails.js'

let connectionListenersRegistered = false
let connectionPromise = null
let connectionAttemptInProgress = false

export const connectDatabase = async () => {
  if (!config.mongodb_uri) {
    throw new Error('MONGODB_URI environment variable is required')
  }

  if (mongoose.connection.readyState === 1) {
    if (mongoose.connection.name !== config.mongodb_database) {
      throw new Error('MongoDB is already connected to a different configured database.')
    }
    return mongoose.connection
  }

  if (connectionPromise) return connectionPromise
  if (mongoose.connection.readyState === 2 || mongoose.connection.readyState === 3) {
    throw new Error('MongoDB connection is already changing state outside the shared connection lifecycle.')
  }

  if (!connectionListenersRegistered) {
    mongoose.connection.on('error', (error) => {
      if (!connectionAttemptInProgress) {
        console.error('[Database] MongoDB connection error.', {
          database: config.mongodb_database || 'unconfigured',
          environment: config.environment_label,
          ...getSafeMongoErrorDetails(error)
        })
      }
    })
    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected.', {
        database: config.mongodb_database || 'unconfigured',
        environment: config.environment_label
      })
    })
    mongoose.connection.on('connected', () => {
      console.info('[Database] MongoDB connected.', {
        database: config.mongodb_database,
        environment: config.environment_label
      })
    })
    connectionListenersRegistered = true
  }

  connectionAttemptInProgress = true
  connectionPromise = mongoose.connect(config.mongodb_uri, {
    serverSelectionTimeoutMS: 10000
  }).then(() => mongoose.connection).catch((error) => {
    throw Object.assign(new Error('Failed to connect to MongoDB.'), {
      cause: error,
      safeDetails: getSafeMongoErrorDetails(error)
    })
  }).finally(() => {
    connectionAttemptInProgress = false
    connectionPromise = null
  })

  return connectionPromise
}

export const disconnectDatabase = async () => {
  if (connectionPromise) {
    await connectionPromise.catch(() => {})
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}

export const getDatabaseStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
  return states[mongoose.connection.readyState] || 'disconnected'
}

export const getDatabaseName = () => getDatabaseStatus() === 'connected' ? mongoose.connection.name || '' : ''

export default { connectDatabase, disconnectDatabase, getDatabaseStatus, getDatabaseName }
