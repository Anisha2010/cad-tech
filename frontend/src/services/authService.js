// import axios from 'axios'
// import apiBaseUrl from '../config/api.js'

// const getBaseUrl = () => apiBaseUrl

// async function request(method, path, data) {
//   const baseUrl = getBaseUrl()
//   if (!baseUrl) return { configured: false }
//   try {
//     const response = await axios({ method, url: `${baseUrl}${path}`, data, withCredentials: true, timeout: 10000 })
//     return { configured: true, data: response.data }
//   } catch (error) {
//     error.authDetails = getAuthErrorDetails(error)
//     throw error
//   }
// }

// function getAuthErrorDetails(error) {
//   console.log("error", error);
//   const responseData = error.response?.data ?? {}
//   const fieldErrors = responseData.errors ?? responseData.validationErrors ?? {}
//   if (!error.response) return { message: 'Unable to connect. Please try again later.', fieldErrors: {} }
//   if (error.response.status === 401) return { message: 'Invalid email or password.', fieldErrors: {} }
//   if (error.response.status === 409) return { message: 'An account with this email already exists.', fieldErrors: {} }
//   return { message: responseData.message || 'Unable to complete your request. Please try again later.', fieldErrors }
// }

// const startGoogleAuthentication = () => {
//   const baseUrl = getBaseUrl()
//   if (!baseUrl) {
//     throw new Error('Social authentication is not connected yet.')
//   }
//   window.location.assign(`${baseUrl}/auth/google`)
// }

// const startGitHubAuthentication = () => {
//   const baseUrl = getBaseUrl()
//   if (!baseUrl) {
//     throw new Error('Social authentication is not connected yet.')
//   }
//   window.location.assign(`${baseUrl}/auth/github`)
// }

// const login = (credentials) => request('post', '/auth/login', credentials)
// const register = (details) => request('post', '/auth/register', details)
// const getCurrentUser = () => request('get', '/auth/me')
// const logout = () => request('post', '/auth/logout')

// export { getAuthErrorDetails, getCurrentUser, login, logout, register, startGitHubAuthentication, startGoogleAuthentication }
import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const API_TIMEOUT_MS = 15000
const getBaseUrl = () => apiBaseUrl

const isTimeoutError = (error) => {
  const message = String(error?.message || '').toLowerCase()
  return error?.code === 'ECONNABORTED' || message.includes('timeout') || message.includes('network')
}

async function request(method, path, data) {
  const baseUrl = getBaseUrl()
  if (!baseUrl) return { configured: false }
  try {
    const response = await axios({ method, url: `${baseUrl}${path}`, data, withCredentials: true, timeout: API_TIMEOUT_MS })
    return { configured: true, data: response.data }
  } catch (error) {
    error.authDetails = getAuthErrorDetails(error)
    throw error
  }
}

function getAuthErrorDetails(error) {
  const responseData = error.response?.data ?? {}
  const fieldErrors = responseData.errors ?? responseData.validationErrors ?? responseData.fieldErrors ?? {}

  if (!error.response && isTimeoutError(error)) {
    return {
      message: 'The backend is not responding. Please start the API server on http://localhost:5000 and try again.',
      fieldErrors: {}
    }
  }

  if (!error.response) return { message: 'Unable to connect. Please try again later.', fieldErrors: {} }
  if (error.response.status === 401) return { message: 'Invalid email or password.', fieldErrors: {} }
  if (error.response.status === 409) return { message: 'An account with this email already exists.', fieldErrors: {} }
  return { message: responseData.message || 'Unable to complete your request. Please try again later.', fieldErrors }
}

const startGoogleAuthentication = () => {
  console.info('[OAuth UI] startGoogleAuthentication called')
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    throw new Error('Social authentication is not connected yet.')
  }
  console.info('[OAuth] redirecting to /auth/google')
  window.location.assign(`${baseUrl}/auth/google`)
}

const startGitHubAuthentication = () => {
  console.info('[OAuth UI] startGitHubAuthentication called')
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    throw new Error('Social authentication is not connected yet.')
  }
  console.info('[OAuth] redirecting to /auth/github')
  window.location.assign(`${baseUrl}/auth/github`)
}

const login = (credentials) => request('post', '/auth/login', credentials)
const requestLoginOtp = (email) => request('post', '/auth/otp/request', { email })
const loginWithOtp = (details) => request('post', '/auth/otp/verify', details)
const verifyEmail = (token) => request('post', '/auth/verify-email', { token })
const resendVerificationEmail = (email) => request('post', '/auth/verification/resend', { email })
const register = (details) => request('post', '/auth/register', details)
const requestPasswordReset = (email) => request('post', '/auth/forgot-password', { email })
const getPasswordResetStatus = () => request('get', '/auth/password-reset/status')
const validatePasswordResetToken = (token) => request('post', '/auth/validate-reset-token', { token })
const resetPassword = (details) => request('post', '/auth/reset-password', details)
const updateProfile = (profile) => request('patch', '/auth/profile', profile)
const uploadProfileImage = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await axios.post(`${getBaseUrl()}/auth/profile/avatar`, formData, {
    withCredentials: true,
    timeout: 120000,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data?.data ?? response.data
}
const changePassword = (details) => request('post', '/auth/change-password', details)
const getCurrentUser = async () => {
  try {
    return await request('get', '/auth/me')
  } catch (error) {
    if (error?.response?.status === 401) {
      const message = error.response?.data?.message || ''
      return {
        configured: false,
        data: { user: null },
        authMessage: /blocked|security change|no longer available/i.test(message) ? message : ''
      }
    }

    throw error
  }
}
const logout = () => request('post', '/auth/logout')

export { changePassword, getAuthErrorDetails, getCurrentUser, getPasswordResetStatus, login, loginWithOtp, logout, register, requestLoginOtp, requestPasswordReset, resendVerificationEmail, resetPassword, startGitHubAuthentication, startGoogleAuthentication, updateProfile, uploadProfileImage, validatePasswordResetToken, verifyEmail }