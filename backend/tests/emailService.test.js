import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmailService } from '../src/services/emailService.js'
import { createMockEmailProvider } from '../src/services/emailProvider.js'

const configuration = {
  node_env: 'development',
  email_provider: 'mock',
  email_from: 'CadTech <no-reply@localhost>',
  email_configuration: { configured: true, missing: [] },
  frontend_url: 'http://localhost:5173',
  login_otp_ttl_minutes: 10,
  email_verification_ttl_hours: 24
}

test('OTP, verification, and reset emails use the centralized sender and include their generated credentials', async () => {
  const mock = createMockEmailProvider()
  const logs = []
  const service = createEmailService({
    configuration,
    mockProvider: mock,
    logger: { error: (...values) => logs.push(values), info: (...values) => logs.push(values) }
  })

  assert.equal(await service.sendLoginOtpEmail('student@example.com', '654321'), true)
  assert.equal(await service.sendVerificationEmail('student@example.com', 'http://localhost:5173/verify-email?token=verification-token'), true)
  assert.equal(await service.sendPasswordResetEmail('student@example.com', 'http://localhost:5173/reset-password?token=reset-token'), true)

  const messages = mock.getMessages()
  assert.deepEqual(messages.map(({ operation }) => operation), ['login_otp', 'email_verification', 'password_reset'])
  assert.ok(messages.every(({ from }) => from === configuration.email_from))
  assert.ok(messages.every(({ to }) => to === 'student@example.com'))
  assert.match(messages[0].text, /654321/)
  assert.match(messages[1].text, /verification-token/)
  assert.match(messages[2].text, /reset-token/)
  assert.deepEqual(logs, [])
})

test('mock transport cannot be used for transactional sending in production', async () => {
  const mock = createMockEmailProvider()
  const service = createEmailService({
    configuration: { ...configuration, node_env: 'production' },
    mockProvider: mock
  })
  assert.equal(await service.sendLoginOtpEmail('student@example.com', '654321'), false)
  assert.deepEqual(mock.getMessages(), [])
})

test('SMTP delivery is not reported as successful when the provider accepts no recipients', async () => {
  const logs = []
  const service = createEmailService({
    configuration: {
      ...configuration,
      node_env: 'production',
      email_provider: 'smtp',
      email_configuration: { configured: true, missing: [] },
      smtp_host: 'smtp.example.net',
      smtp_port: '587',
      smtp_secure: 'false',
      smtp_user: 'user',
      smtp_password: 'secret',
      frontend_url: 'https://cadtech.vercel.app'
    },
    createTransport: () => ({
      async verify() {},
      async sendMail() { return { accepted: [], rejected: ['person@example.com'] } }
    }),
    logger: { error: (...values) => logs.push(values), info() {} }
  })
  assert.equal(await service.sendVerificationEmail('person@example.com', 'https://cadtech.vercel.app/verify-email?token=redacted'), false)
  assert.ok(logs.some(([message]) => message.includes('did not accept')))
  assert.doesNotMatch(JSON.stringify(logs), /person@example\.com|redacted|secret/)
})
