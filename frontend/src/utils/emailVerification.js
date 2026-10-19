const pendingVerifications = new Map()

export const isValidVerificationToken = (token) =>
  typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token)

export const requestEmailVerification = async (request, token) => {
  const response = await request('post', '/auth/verify-email', { token })
  if (!response.configured) throw new Error('The verification service is not configured.')
  return response
}

export const verifyEmailOnce = (token, verifyRequest) => {
  if (!pendingVerifications.has(token)) {
    const request = Promise.resolve().then(() => verifyRequest(token)).then((response) => {
      if (response?.data?.data?.emailVerified !== true) {
        throw new Error('The server did not confirm email verification.')
      }
      return response
    })
    pendingVerifications.set(token, request)
    request.finally(() => {
      if (pendingVerifications.get(token) === request) pendingVerifications.delete(token)
    }).catch(() => {})
  }
  return pendingVerifications.get(token)
}
