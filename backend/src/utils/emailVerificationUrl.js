import net from 'node:net'

const isNonPublicHostname = (hostname) => {
  const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  return net.isIP(normalizedHostname) !== 0 ||
    normalizedHostname === 'localhost' ||
    ['.localhost', '.local', '.internal', '.example', '.test', '.invalid'].some((suffix) => normalizedHostname.endsWith(suffix))
}

export const normalizeFrontendOrigin = (frontendUrl, { production = false } = {}) => {
  if (typeof frontendUrl !== 'string' || !frontendUrl.trim()) {
    throw new Error('FRONTEND_URL is required to generate email verification links.')
  }

  let url
  try {
    url = new URL(frontendUrl.trim())
  } catch {
    throw new Error('FRONTEND_URL must be a valid HTTP(S) frontend origin.')
  }

  if (!['http:', 'https:'].includes(url.protocol) ||
      url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('FRONTEND_URL must be a valid HTTP(S) frontend origin without a path, query, or credentials.')
  }

  if (production && (url.protocol !== 'https:' || isNonPublicHostname(url.hostname))) {
    throw new Error('FRONTEND_URL must be a public HTTPS origin in production.')
  }

  return url.origin
}

export const buildEmailVerificationUrl = (frontendUrl, token, options) => {
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('A verification token is required to generate an email verification link.')
  }

  const url = new URL('/verify-email', normalizeFrontendOrigin(frontendUrl, options))
  url.searchParams.set('token', token)
  return url.toString()
}
