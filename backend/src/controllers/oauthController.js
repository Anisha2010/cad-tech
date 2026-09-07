/**
 * OAuth Controller
 * Handles HTTP requests for OAuth authentication endpoints
 * Delegates business logic to oauthService and oauth config
 */
import config from '../config/environment.js'
import * as oauthConfig from '../config/oauth.js'
import * as oauthService from '../services/oauthService.js'
import * as User from '../models/User.js'
import asyncHandler from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'

/**
 * GET /auth/google
 * Initiate Google OAuth login flow
 */
export const startGoogleAuth = asyncHandler(async (req, res) => {
  if (!oauthConfig.isGoogleOAuthConfigured()) {
    const url = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed')
    return res.redirect(url)
  }

  try {
    const { client } = await oauthConfig.initializeGoogleClient()
    const { state, nonce } = oauthService.buildOAuthState(req, 'google')

    const authUrl = client.authorizationUrl({
      scope: 'openid email profile',
      state,
      nonce,
      prompt: 'consent'
    })

    res.redirect(authUrl)
  } catch (error) {
    const url = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed')
    res.redirect(url)
  }
})

/**
 * GET /auth/google/callback
 * Handle Google OAuth callback
 */
export const handleGoogleCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query

  if (error) {
    const reason = String(error).toLowerCase() === 'access_denied' ? 'cancelled' : 'oauth_failed'
    const url = oauthService.buildFrontendCallbackUrl('error', reason)
    return res.redirect(url)
  }

  // Validate state
  const savedState = oauthService.validateOAuthState(req, 'google', String(state || ''))
  if (!savedState) {
    const url = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed')
    return res.redirect(url)
  }

  const { nonce } = savedState
  oauthService.clearOAuthState(req)

  try {
    const { client } = await oauthConfig.initializeGoogleClient()
    const googleCallbackUrl =
      config.google_callback_url || `${req.protocol}://${req.get('host')}/auth/google/callback`

    // Exchange code for token
    const tokenSet = await client.callback(googleCallbackUrl, { code, state }, { nonce, state: String(state) })
    const claims = tokenSet.claims()

    // Verify issuer
    if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') {
      throw new Error('invalid_issuer')
    }

    // Verify email
    if (!claims.email_verified || !claims.email) {
      throw Object.assign(new Error('missing_verified_email'), { code: 'missing_verified_email' })
    }

    // Find or create user
    const user = await oauthService.findOrCreateOAuthUser({
      provider: 'google',
      providerUserId: claims.sub,
      email: claims.email,
      name: claims.name || claims.given_name || 'Google User'
    })

    // Create session
    await oauthService.createOAuthSession(req, user)

    // Redirect to frontend with success
    const successUrl = oauthService.buildFrontendCallbackUrl('success')
    res.redirect(successUrl)
  } catch (err) {
    const message = err?.code || err?.message || ''
    const errorUrl = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed')
    res.redirect(errorUrl)
  }
})

/**
 * GET /auth/github
 * Initiate GitHub OAuth login flow
 */
export const startGitHubAuth = asyncHandler(async (req, res) => {
  if (!oauthConfig.isGitHubOAuthConfigured()) {
    const url = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed')
    return res.redirect(url)
  }

  const clientId = config.github_client_id
  const githubCallbackUrl =
    config.github_callback_url || `${req.protocol}://${req.get('host')}/auth/github/callback`

  const { state } = oauthService.buildOAuthState(req, 'github')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: githubCallbackUrl,
    state,
    scope: 'read:user user:email'
  })

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`)
})

/**
 * GET /auth/github/callback
 * Handle GitHub OAuth callback
 */
export const handleGitHubCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query

  if (error) {
    const reason = String(error).toLowerCase() === 'access_denied' ? 'cancelled' : 'oauth_failed'
    const url = oauthService.buildFrontendCallbackUrl('error', reason)
    return res.redirect(url)
  }

  // Validate state
  const savedState = oauthService.validateOAuthState(req, 'github', String(state || ''))
  if (!savedState) {
    const url = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed')
    return res.redirect(url)
  }

  oauthService.clearOAuthState(req)

  try {
    const githubCallbackUrl =
      config.github_callback_url || `${req.protocol}://${req.get('host')}/auth/github/callback`

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: config.github_client_id,
        client_secret: config.github_client_secret,
        code: String(code),
        redirect_uri: githubCallbackUrl,
        state: String(state)
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData?.access_token) {
      throw new Error('oauth_failed')
    }

    // Get GitHub user profile
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    const githubUser = await userResponse.json()

    if (!githubUser?.id) {
      throw new Error('oauth_failed')
    }

    // Get verified email
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    const emailData = await emailResponse.json()
    const verifiedEmail = Array.isArray(emailData)
      ? emailData.find((entry) => entry.verified && entry.email)
      : null

    if (!verifiedEmail?.email) {
      throw Object.assign(new Error('missing_verified_email'), { code: 'missing_verified_email' })
    }

    // Find or create user
    const user = await oauthService.findOrCreateOAuthUser({
      provider: 'github',
      providerUserId: String(githubUser.id),
      email: verifiedEmail.email,
      name: githubUser.name || githubUser.login || 'GitHub User'
    })

    // Create session
    await oauthService.createOAuthSession(req, user)

    // Redirect to frontend with success
    const successUrl = oauthService.buildFrontendCallbackUrl('success')
    res.redirect(successUrl)
  } catch (err) {
    const errorUrl = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed')
    res.redirect(errorUrl)
  }
})

export default {
  startGoogleAuth,
  handleGoogleCallback,
  startGitHubAuth,
  handleGitHubCallback
}
