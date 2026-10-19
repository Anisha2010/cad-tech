import test from 'node:test'
import assert from 'node:assert/strict'
import { assertEmailConfiguration, getEmailConfiguration } from '../src/config/email.js'

test('explicit development mock selects the mock provider even when Resend credentials are present', () => {
  const configuration = getEmailConfiguration({
    NODE_ENV: 'development',
    EMAIL_PROVIDER: 'mock',
    EMAIL_FROM: 'CadTech <no-reply@localhost>',
    RESEND_API_KEY: 're_unused_test_key',
    RESEND_FROM: 'onboarding@resend.dev'
  })
  assert.equal(configuration.configured, true)
  assert.equal(configuration.provider, 'mock')
  assert.equal(configuration.from, 'CadTech <no-reply@localhost>')
  assert.doesNotThrow(() => assertEmailConfiguration(configuration))
})

test('legacy SMTP and Resend sender variables remain compatible fallbacks', () => {
  assert.equal(getEmailConfiguration({
    NODE_ENV: 'development',
    EMAIL_PROVIDER: 'smtp',
    SMTP_FROM: 'CadTech <sender@example.test>'
  }).from, 'CadTech <sender@example.test>')
  assert.equal(getEmailConfiguration({
    NODE_ENV: 'development',
    EMAIL_PROVIDER: 'resend',
    RESEND_FROM: 'CadTech <sender@example.test>'
  }).from, 'CadTech <sender@example.test>')
})

test('production Resend configuration requires its key and a non-placeholder sender', () => {
  const valid = getEmailConfiguration({
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'CadTech <noreply@mail.cadtech.com>'
  })
  assert.equal(valid.configured, true)
  assert.doesNotThrow(() => assertEmailConfiguration(valid))

  const missingKey = getEmailConfiguration({
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'resend',
    EMAIL_FROM: 'CadTech <noreply@mail.cadtech.com>'
  })
  assert.throws(() => assertEmailConfiguration(missingKey), /RESEND_API_KEY/)

  const onboarding = getEmailConfiguration({
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'onboarding@resend.dev'
  })
  assert.doesNotThrow(() => assertEmailConfiguration(onboarding))

  const otherResendDev = getEmailConfiguration({
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'noreply@resend.dev'
  })
  assert.throws(() => assertEmailConfiguration(otherResendDev), /verified domain/)

  const sandboxWithSmtp = getEmailConfiguration({
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'smtp',
    SMTP_HOST: 'smtp.example.net',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'user',
    SMTP_PASSWORD: 'secret',
    EMAIL_FROM: 'onboarding@resend.dev'
  })
  assert.throws(() => assertEmailConfiguration(sandboxWithSmtp), /verified domain/)
})

test('production requires configured real email delivery and rejects mock delivery', () => {
  const missingSender = getEmailConfiguration({
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'smtp',
    SMTP_HOST: 'smtp.example.net',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'user',
    SMTP_PASSWORD: 'secret'
  })
  assert.ok(missingSender.missing.includes('EMAIL_FROM'))
  assert.throws(() => assertEmailConfiguration(missingSender), /EMAIL_FROM/)

  const invalidSender = getEmailConfiguration({
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'noreply@your-verified-domain.com'
  })
  assert.throws(() => assertEmailConfiguration(invalidSender), /verified domain/)

  const mockProduction = getEmailConfiguration({
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'mock',
    EMAIL_FROM: 'CadTech <no-reply@localhost>'
  })
  assert.throws(() => assertEmailConfiguration(mockProduction), /only available/)

  const smtpProduction = getEmailConfiguration({
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'smtp',
    SMTP_HOST: 'smtp.example.net',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'user',
    SMTP_PASSWORD: 'secret',
    EMAIL_FROM: 'CadTech <noreply@mail.cadtech.com>'
  })
  assert.doesNotThrow(() => assertEmailConfiguration(smtpProduction))

  const incompleteSmtpProduction = getEmailConfiguration({
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'smtp',
    SMTP_HOST: 'smtp.example.net',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'user',
    SMTP_PASSWORD: 'secret',
    EMAIL_FROM: 'no-reply@your-domain.example'
  })
  assert.throws(() => assertEmailConfiguration(incompleteSmtpProduction), /verified domain/)
})

test('production rejects unknown providers and malformed sender addresses clearly', () => {
  const unsupported = getEmailConfiguration({
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'unknown',
    EMAIL_FROM: 'not-an-email'
  })
  assert.throws(() => assertEmailConfiguration(unsupported), /EMAIL_PROVIDER/)

  const malformed = getEmailConfiguration({
    NODE_ENV: 'production',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 're_test_key',
    EMAIL_FROM: 'not-an-email'
  })
  assert.throws(() => assertEmailConfiguration(malformed), /EMAIL_FROM/)
})
