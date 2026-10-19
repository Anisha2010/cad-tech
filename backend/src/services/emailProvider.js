import { getEmailConfiguration } from '../config/email.js'

const sanitizeProviderError = (status) => {
  if (status === 403) return 'Provider rejected the sender/domain or API-key permissions; verify the sending domain and key access.'
  if (status === 429) return 'Provider rate limit reached.'
  if (typeof status === 'number' && status >= 500) return 'Email provider is temporarily unavailable.'
  if (typeof status === 'number') return 'Email provider rejected the request.'
  return 'Email provider request failed before acceptance.'
}

export const getEmailProviderConfig = (env = process.env) => {
  const { provider, apiKey, from, missing, configured } = getEmailConfiguration(env)
  return {
    provider,
    configured,
    missing,
    hasApiKey: Boolean(apiKey),
    from
  }
}

export const createEmailProvider = ({
  fetchImpl = globalThis.fetch,
  getConfig = getEmailConfiguration,
  logger = console
} = {}) => ({
  async send({ to, subject, text, html, operation = 'transactional_email' }) {
    const config = getConfig()
    if (config.provider !== 'resend' || !config.configured) {
      logger.error('[Email] Delivery unavailable.', {
        provider: config.provider,
        operation,
        status: null,
        message: `Configure: ${config.missing.join(', ') || 'EMAIL_PROVIDER=resend'}.`
      })
      return false
    }

    let status
    try {
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: config.from, to, subject, text, html })
      })
      status = response.status
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.id) {
        logger.error('[Email] Provider delivery failed.', {
          provider: 'resend',
          operation,
          status,
          message: sanitizeProviderError(status)
        })
        return false
      }

      return true
    } catch {
      logger.error('[Email] Provider delivery failed.', {
        provider: 'resend',
        operation,
        status: status ?? null,
        message: sanitizeProviderError(status)
      })
      return false
    }
  }
})

export const createMockEmailProvider = () => {
  const messages = []

  return {
    async send(message) {
      messages.push({ ...message, createdAt: new Date().toISOString() })
      return true
    },
    getMessages() {
      return messages.map((message) => ({ ...message }))
    },
    clearMessages() {
      messages.length = 0
    }
  }
}

const provider = createEmailProvider()
export const mockEmailProvider = createMockEmailProvider()

export default provider
