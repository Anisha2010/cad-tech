import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmailProvider, getEmailProviderConfig } from '../src/services/emailProvider.js'

const resendConfig = {
  provider: 'resend',
  apiKey: 're_test_secret_key',
  from: 'CadTech <noreply@mail.cadtech.test>',
  configured: true,
  missing: []
}

const testMessage = {
  operation: 'email_verification',
  to: 'person@example.com',
  subject: 'Verify your email',
  text: 'Verify using secret-token',
  html: '<p>Verify using secret-token</p>'
}

test('Resend submits configured sender and confirms API acceptance without logging secrets', async () => {
  const requests = []
  const logs = []
  const provider = createEmailProvider({
    getConfig: () => resendConfig,
    logger: { error: (...items) => logs.push(items) },
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return { ok: true, status: 200, json: async () => ({ id: 'email_123' }) }
    }
  })

  assert.equal(await provider.send(testMessage), true)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, 'https://api.resend.com/emails')
  assert.equal(requests[0].options.headers.Authorization, 'Bearer re_test_secret_key')
  const payload = JSON.parse(requests[0].options.body)
  assert.equal(payload.from, resendConfig.from)
  assert.equal(payload.to, testMessage.to)
  assert.equal(payload.text, testMessage.text)
  assert.deepEqual(logs, [])
})

for (const status of [403, 429, 503]) {
  test(`Resend ${status} response is reported as failure with sanitized operation metadata`, async () => {
    const logs = []
    const provider = createEmailProvider({
      getConfig: () => resendConfig,
      logger: { error: (...items) => logs.push(items) },
      fetchImpl: async () => ({
        ok: false,
        status,
        json: async () => ({
          message: `re_test_secret_key ${testMessage.to} ${testMessage.text}`
        })
      })
    })

    assert.equal(await provider.send(testMessage), false)
    const serializedLogs = JSON.stringify(logs)
    assert.match(serializedLogs, /resend/)
    assert.match(serializedLogs, /email_verification/)
    assert.match(serializedLogs, new RegExp(String(status)))
    assert.doesNotMatch(serializedLogs, /re_test_secret_key|person@example\.com|secret-token/)
  })
}

test('network errors and unconfirmed success responses do not report acceptance', async () => {
  const logs = []
  const networkFailure = createEmailProvider({
    getConfig: () => resendConfig,
    logger: { error: (...items) => logs.push(items) },
    fetchImpl: async () => { throw new Error(`secret-token to ${testMessage.to}`) }
  })
  const missingId = createEmailProvider({
    getConfig: () => resendConfig,
    logger: { error: (...items) => logs.push(items) },
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) })
  })

  assert.equal(await networkFailure.send(testMessage), false)
  assert.equal(await missingId.send(testMessage), false)
  assert.doesNotMatch(JSON.stringify(logs), /secret-token|person@example\.com/)
})

test('provider configuration reports missing API key and canonical sender without exposing secrets', () => {
  const missing = getEmailProviderConfig({
    NODE_ENV: 'development',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: ''
  })
  assert.equal(missing.configured, false)
  assert.deepEqual(missing.missing, ['EMAIL_FROM', 'RESEND_API_KEY'])
  assert.equal(JSON.stringify(missing).includes('apiKey'), false)
})

test('mock provider retains transactional messages only in its in-memory preview buffer', async () => {
  const { createMockEmailProvider } = await import('../src/services/emailProvider.js')
  const mock = createMockEmailProvider()
  await mock.send({ operation: 'login_otp', text: '654321' })
  assert.equal(mock.getMessages()[0].text, '654321')
  mock.clearMessages()
  assert.deepEqual(mock.getMessages(), [])
})
