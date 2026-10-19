import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { once } from 'node:events'
import { createDevEmailPreviewRouter, isDevEmailPreviewEnabled } from '../src/routes/devEmailPreviewRoutes.js'
import { createEmailAuthService } from '../src/services/emailAuthService.js'
import { createEmailService } from '../src/services/emailService.js'
import { createMockEmailProvider } from '../src/services/emailProvider.js'

const request = async (server, method = 'GET') => fetch(
  `http://127.0.0.1:${server.address().port}/__dev/email-preview`,
  { method }
)

test('application mounts the preview only for the development mock provider', () => {
  assert.equal(isDevEmailPreviewEnabled({ environment_label: 'development', email_provider: 'mock' }), true)
  assert.equal(isDevEmailPreviewEnabled({ environment_label: 'production', email_provider: 'mock' }), false)
  assert.equal(isDevEmailPreviewEnabled({ environment_label: 'development', email_provider: 'resend' }), false)
  assert.equal(isDevEmailPreviewEnabled({ environment_label: 'e2e', email_provider: 'mock' }), false)
})

test('development mock preview is loopback-only, no-store, and can be cleared', async () => {
  const preview = {
    getMessages: () => [{ operation: 'login_otp', text: 'local-only-token' }],
    clearMessages() { this.cleared = true }
  }
  const app = express()
  app.use('/__dev/email-preview', createDevEmailPreviewRouter({
    nodeEnv: 'development',
    provider: preview
  }))
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')

  try {
    const response = await request(server)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual((await response.json()).messages, [{ operation: 'login_otp', text: 'local-only-token' }])
    assert.equal((await request(server, 'DELETE')).status, 204)
    assert.equal(preview.cleared, true)
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})

test('development email preview exposes the verification URL generated for the configured frontend origin', async () => {
  const mockProvider = createMockEmailProvider()
  const emailService = createEmailService({
    configuration: {
      node_env: 'development',
      email_provider: 'mock',
      email_from: 'CadTech <no-reply@localhost>',
      email_configuration: { configured: true, missing: [] },
      frontend_url: 'http://localhost:5173',
      email_verification_ttl_hours: 24
    },
    mockProvider
  })
  const repository = {
    async issueEmailVerification() { return { _id: 'user-id' } }
  }
  const service = createEmailAuthService({
    repository,
    verificationMailer: emailService.sendVerificationEmail,
    frontendUrl: 'http://localhost:5173',
    generateToken: () => 'v'.repeat(43)
  })
  await service.sendVerificationForUser({ _id: 'user-id', email: 'person@example.com', emailVerified: false }, { ignoreCooldown: true })

  const app = express()
  app.use('/__dev/email-preview', createDevEmailPreviewRouter({ nodeEnv: 'development', provider: mockProvider }))
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const response = await request(server)
    assert.equal(response.status, 200)
    const { messages } = await response.json()
    const verificationUrl = new URL(messages[0].text.match(/https?:\/\/\S+/)[0])
    assert.equal(verificationUrl.origin, 'http://localhost:5173')
    assert.equal(verificationUrl.pathname, '/verify-email')
    assert.equal(verificationUrl.searchParams.get('token'), 'v'.repeat(43))
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})

test('preview routes are not registered in production or without a mock provider', async () => {
  for (const router of [
    createDevEmailPreviewRouter({ nodeEnv: 'production', provider: { getMessages() {}, clearMessages() {} } }),
    createDevEmailPreviewRouter({ nodeEnv: 'development' })
  ]) {
    const app = express()
    app.use('/__dev/email-preview', router)
    const server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    try {
      assert.equal((await request(server)).status, 404)
    } finally {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
    }
  }
})

test('non-loopback preview clients receive not found', async () => {
  const app = express()
  app.use('/__dev/email-preview', createDevEmailPreviewRouter({
    nodeEnv: 'development',
    provider: { getMessages: () => [], clearMessages() {} },
    isLoopback: () => false
  }))
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    assert.equal((await request(server)).status, 404)
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})
