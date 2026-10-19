const validProviders = new Set(['smtp', 'resend', 'mock'])

const senderAddress = (sender) => {
  const match = String(sender || '').match(/<([^<>]+)>/)
  return (match?.[1] || sender || '').trim()
}

const isValidSender = (sender) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(senderAddress(sender))

const isPlaceholderSender = (sender) => {
  const address = senderAddress(sender).toLowerCase()
  const domain = address.split('@')[1] || ''
  return domain === 'resend.dev' || domain.includes('example') ||
    ['.test', '.localhost', '.invalid', '.local'].some((suffix) => domain.endsWith(suffix)) ||
    /your[-_]/.test(address)
}

export const getEmailConfiguration = (env = process.env) => {
  const nodeEnv = String(env.NODE_ENV || 'development').trim().toLowerCase()
  const provider = String(env.EMAIL_PROVIDER || 'smtp').trim().toLowerCase()
  const apiKey = String(env.RESEND_API_KEY || '').trim()
  const from = String(env.EMAIL_FROM || env.RESEND_FROM || env.SMTP_FROM || '').trim()
  const smtpHost = String(env.SMTP_HOST || '').trim()
  const smtpPort = String(env.SMTP_PORT || '').trim()
  const smtpSecure = String(env.SMTP_SECURE || '').trim().toLowerCase()
  const smtpUser = String(env.SMTP_USER || '').trim()
  const smtpPassword = String(env.SMTP_PASSWORD || '').trim()
  const missing = []

  if (!validProviders.has(provider)) missing.push('EMAIL_PROVIDER')
  if (!from) missing.push('EMAIL_FROM')

  if (provider === 'resend' && !apiKey) missing.push('RESEND_API_KEY')
  if (provider === 'smtp') {
    if (!smtpHost) missing.push('SMTP_HOST')
    if (!smtpPort || !Number.isInteger(Number(smtpPort)) || Number(smtpPort) < 1 || Number(smtpPort) > 65535) missing.push('SMTP_PORT')
    if (!['true', 'false'].includes(smtpSecure)) missing.push('SMTP_SECURE')
    if (!smtpUser) missing.push('SMTP_USER')
    if (!smtpPassword) missing.push('SMTP_PASSWORD')
  }

  return {
    nodeEnv,
    provider,
    apiKey,
    from,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPassword,
    configured: missing.length === 0,
    missing: [...new Set(missing)]
  }
}

export const assertEmailConfiguration = (emailConfig) => {
  if (!validProviders.has(emailConfig.provider)) {
    throw new Error('EMAIL_PROVIDER must be smtp, resend, or mock in development/tests.')
  }

  if (emailConfig.provider === 'mock' && emailConfig.nodeEnv !== 'development' && emailConfig.nodeEnv !== 'test') {
    throw new Error('The mock email provider is only available in development or tests.')
  }

  if (emailConfig.nodeEnv !== 'production') return

  const problems = [...emailConfig.missing]
  if (!isValidSender(emailConfig.from)) problems.push('EMAIL_FROM')
  if (isPlaceholderSender(emailConfig.from)) problems.push('EMAIL_FROM (use a sender on your verified domain)')

  if (problems.length) {
    throw new Error(`Invalid production email configuration. Configure: ${[...new Set(problems)].join(', ')}.`)
  }
}
