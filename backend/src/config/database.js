import mongoose from 'mongoose'
import config from './environment.js'

let connectionListenersRegistered = false

export const connectDatabase = async () => {
  if (!config.mongodb_uri) {
    throw new Error('MONGODB_URI environment variable is required')
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection

  if (!connectionListenersRegistered) {
    mongoose.connection.on('error', () => console.error('MongoDB connection failed'))
    mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'))
    connectionListenersRegistered = true
  }

  try {
    await mongoose.connect(config.mongodb_uri)
    console.log('MongoDB connected')
    return mongoose.connection
  } catch {
    console.error('MongoDB connection failed')
    throw new Error('Failed to connect to MongoDB')
  }
}

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}

export const getDatabaseStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
  return states[mongoose.connection.readyState] || 'disconnected'
}

export const getDatabaseName = () => mongoose.connection.name || ''

export default { connectDatabase, disconnectDatabase, getDatabaseStatus, getDatabaseName }
