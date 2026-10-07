/**
 * OAuth configuration
 * Initializes Google OpenID Connect and GitHub OAuth clients
 * Preserves all OAuth state management and validation logic
 */
import * as openidClient from 'openid-client'
import config from './environment.js'

let googleClient = null

/**
 * Initialize Google OpenID Connect client
 * Lazy loads and caches the client to avoid re-initialization on every request
 */
export const initializeGoogleClient = async () => {
  if (!config.google_client_id || !config.google_client_secret) {
    throw new Error('Google OAuth credentials not configured')
  }

  if (googleClient) {
    return { client: googleClient }
  }

  try {
    googleClient = await openidClient.discovery(
      new URL('https://accounts.google.com'),
      config.google_client_id,
      config.google_client_secret
    )

    return { client: googleClient }
  } catch (error) {
    throw new Error('Failed to initialize Google OAuth client')
  }
}

/**
 * Get cached Google OAuth client
 */
export const getGoogleClient = async () => {
  if (!googleClient) {
    await initializeGoogleClient()
  }
  return googleClient
}

/**
 * Check if Google OAuth is configured
 */
export const isGoogleOAuthConfigured = () => {
  return !!(config.google_client_id && config.google_client_secret && config.google_callback_url)
}

/**
 * Check if GitHub OAuth is configured
 */
export const isGitHubOAuthConfigured = () => {
  return !!(config.github_client_id && config.github_client_secret && config.github_callback_url)
}

export default {
  initializeGoogleClient,
  getGoogleClient,
  isGoogleOAuthConfigured,
  isGitHubOAuthConfigured,
  googleCallbackUrl: config.google_callback_url,
  githubCallbackUrl: config.github_callback_url
}
