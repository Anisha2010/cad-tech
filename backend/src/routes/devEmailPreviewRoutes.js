import express from 'express'
import net from 'node:net'

const isLoopbackAddress = (address) => {
  if (address === '::1' || address === '127.0.0.1') return true
  if (address?.startsWith('::ffff:')) return net.isIPv4(address.slice(7)) && address.slice(7).startsWith('127.')
  return false
}

export const isDevEmailPreviewEnabled = ({ environment_label, email_provider }) =>
  environment_label === 'development' && email_provider === 'mock'

export const createDevEmailPreviewRouter = ({
  nodeEnv = process.env.NODE_ENV || 'development',
  provider,
  isLoopback = (request) => isLoopbackAddress(request.socket.remoteAddress)
} = {}) => {
  const router = express.Router()
  if (nodeEnv !== 'development' || !provider) return router

  router.use((request, response, next) => {
    if (!isLoopback(request)) {
      response.sendStatus(404)
      return
    }
    next()
  })

  router.get('/', (request, response) => {
    response.set('Cache-Control', 'no-store')
    response.json({ messages: provider.getMessages() })
  })

  router.delete('/', (request, response) => {
    provider.clearMessages()
    response.sendStatus(204)
  })

  return router
}
