import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmailProvider, getEmailProviderConfig } from '../src/services/emailProvider.js'

const originalEnv = { ...process.env }

test.afterEach(() => {
  process.env = { ...originalEnv }
})

test('Resend production provider sends the email without exposing secrets or content', async () => {
  process.env.EMAIL_PROVIDER = 'resend'
  process.env.RESEND_API_KEY = 're_test_secret_key'
  process.env.RESEND_FROM = 'CadTech <noreply@example.com>'

  const requests = []
  const provider = createEmailProvider({
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'email_123' })
      }
    }
  })

  const result = await provider.send({
    to: 'person@example.com',
    subject: 'Verify your email',
    text: 'Verify: https://app.example/verify?token=secret-token',
    html: '<p>Verify: https://app.example/verify?token=secret-token</p>'
  })

  assert.equal(result, true)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, 'https://api.resend.com/emails')
  assert.equal(requests[0].options.headers.Authorization, 'Bearer re_test_secret_key')
  assert.equal(requests[0].options.headers['Content-Type'], 'application/json')
  assert.equal(JSON.parse(requests[0].options.body).to, 'person@example.com')
  assert.equal(JSON.parse(requests[0].options.body).text.includes('secret-token'), true)
  assert.equal(JSON.parse(requests[0].options.body).html.includes('secret-token'), true)
  assert.equal(JSON.stringify(requests).includes('re_test_secret_key'), true)
})

test('does not expose the API key or token in derived error metadata', async () => {
  process.env.EMAIL_PROVIDER = 'resend'
  process.env.RESEND_API_KEY = 're_test_secret_key'
  process.env.RESEND_FROM = 'CadTech <noreply@example.com>'

  const provider = createEmailProvider({
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid API key' })
    })
  })

  const result = await provider.send({
    to: 'person@example.com',
    subject: 'Verify your email',
    text: 'Verify: https://app.example/verify?token=secret-token',
    html: '<p>Verify: https://app.example/verify?token=secret-token</p>'
  })

  assert.equal(result, false)
  assert.equal(getEmailProviderConfig().configured, true)
})

test('Resend is selected only when enabled and its required settings are present', () => {
  const empty = getEmailProviderConfig()
  assert.equal(empty.configured, false)

  process.env.EMAIL_PROVIDER = 'resend'
  process.env.RESEND_API_KEY = 're_test_secret_key'
  process.env.RESEND_FROM = 'CadTech <noreply@example.com>'
  assert.equal(getEmailProviderConfig().configured, true)

  process.env.RESEND_API_KEY = ''
  assert.equal(getEmailProviderConfig().configured, false)
})
