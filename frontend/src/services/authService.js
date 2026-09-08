import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const getBaseUrl = () => apiBaseUrl

async function request(method, path, data) {
  const baseUrl = getBaseUrl()
  if (!baseUrl) return { configured: false }
  try {
    const response = await axios({ method, url: `${baseUrl}${path}`, data, withCredentials: true, timeout: 10000 })
    return { configured: true, data: response.data }
  } catch (error) {
    error.authDetails = getAuthErrorDetails(error)
    throw error
  }
}

function getAuthErrorDetails(error) {
  const responseData = error.response?.data ?? {}
  const fieldErrors = responseData.errors ?? responseData.validationErrors ?? {}
  if (!error.response) return { message: 'Unable to connect. Please try again later.', fieldErrors: {} }
  if (error.response.status === 401) return { message: 'Invalid email or password.', fieldErrors: {} }
  if (error.response.status === 409) return { message: 'An account with this email already exists.', fieldErrors: {} }
  return { message: responseData.message || 'Unable to complete your request. Please try again later.', fieldErrors }
}

const startGoogleAuthentication = () => {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    throw new Error('Social authentication is not connected yet.')
  }
  window.location.assign(`${baseUrl}/auth/google`)
}

const startGitHubAuthentication = () => {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    throw new Error('Social authentication is not connected yet.')
  }
  window.location.assign(`${baseUrl}/auth/github`)
}

const login = (credentials) => request('post', '/auth/login', credentials)
const register = (details) => request('post', '/auth/register', details)
const getCurrentUser = () => request('get', '/auth/me')
const logout = () => request('post', '/auth/logout')

export { getAuthErrorDetails, getCurrentUser, login, logout, register, startGitHubAuthentication, startGoogleAuthentication }