import test from 'node:test'
import assert from 'node:assert/strict'
import { runProviderSmokeTest } from '../scripts/email-provider-smoke.js'

test('provider smoke test uses only Resend sandbox sender and recipient', async () => {
  let sentMessage
  const providerFactory = ({ getConfig }) => ({
    async send(message) {
      assert.equal(getConfig().from, 'onboarding@resend.dev')
      sentMessage = message
      return true
    }
  })

  const result = await runProviderSmokeTest({
    env: { NODE_ENV: 'development', EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_test_key' },
    providerFactory,
    logger: {}
  })
  assert.match(result, /does not verify actual inbox delivery/)
  assert.equal(sentMessage.from, undefined)
  assert.equal(sentMessage.to, 'delivered@resend.dev')
  assert.equal(sentMessage.operation, 'provider_smoke_test')
  assert.doesNotMatch(JSON.stringify(sentMessage), /OTP|reset token|verification token/i)
})

test('provider smoke test refuses production, wrong provider, and missing API key', async () => {
  await assert.rejects(runProviderSmokeTest({
    env: { NODE_ENV: 'production', EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_test_key' }
  }), /disabled in production/)
  await assert.rejects(runProviderSmokeTest({
    env: { NODE_ENV: 'development', EMAIL_PROVIDER: 'smtp', RESEND_API_KEY: 're_test_key' }
  }), /EMAIL_PROVIDER=resend/)
  await assert.rejects(runProviderSmokeTest({
    env: { NODE_ENV: 'development', EMAIL_PROVIDER: 'resend' }
  }), /RESEND_API_KEY/)
})
