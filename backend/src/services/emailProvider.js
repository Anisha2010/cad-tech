const DEFAULT_PROVIDER = 'smtp'

const safeProviderError = (error) => ({
  provider: 'resend',
  name: error?.name,
  code: typeof error?.code === 'string' ? error.code : undefined,
  status: typeof error?.status === 'number' ? error.status : undefined,
  message: error?.message
})

export const getEmailProviderConfig = () => {
  const provider = String(process.env.EMAIL_PROVIDER || DEFAULT_PROVIDER).toLowerCase()
  const apiKey = String(process.env.RESEND_API_KEY || '').trim()
  const from = String(process.env.RESEND_FROM || '').trim()

  return {
    provider,
    configured: provider === 'resend' ? Boolean(apiKey && from) : false,
    missing: provider === 'resend' ? ['RESEND_API_KEY', 'RESEND_FROM'].filter((name) => {
      if (name === 'RESEND_API_KEY') return !apiKey
      return !from
    }) : []
  }
}

export const createEmailProvider = ({ fetchImpl = globalThis.fetch } = {}) => ({
  async send({ to, subject, text, html }) {
    const config = getEmailProviderConfig()
    if (!config.configured) return false

    try {
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${String(process.env.RESEND_API_KEY || '').trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: String(process.env.RESEND_FROM || '').trim(),
          to,
          subject,
          text,
          html
        })
      })

      const payload = response.ok ? await response.json() : await response.json().catch(() => ({}))
      if (!response.ok) {
        throw Object.assign(new Error(payload?.message || 'Resend email delivery failed'), {
          code: 'RESEND_HTTP_ERROR',
          status: response.status
        })
      }

      return Boolean(payload?.id)
    } catch (error) {
      console.error('[Email] Resend delivery failed.', safeProviderError(error))
      return false
    }
  }
})

const provider = createEmailProvider()

export default provider
