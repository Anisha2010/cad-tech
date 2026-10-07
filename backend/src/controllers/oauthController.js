/**
 * OAuth Controller
 * Handles HTTP requests for OAuth authentication endpoints
 * Delegates business logic to oauthService and oauth config
 */
import config from '../config/environment.js'
import * as openidClient from 'openid-client'
import * as oauthConfig from '../config/oauth.js'
import * as oauthService from '../services/oauthService.js'
import * as User from '../models/User.js'
import asyncHandler from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'

const safeOAuthErrorCode = (error) => {
  const code = error?.code
  if (typeof code !== 'string') return 'UNAVAILABLE'
  if (/^(ERR|OAUTH)_[A-Z0-9_]{1,60}$/.test(code)) return code
  if (['invalid_issuer', 'missing_verified_email'].includes(code)) return code
  if (code === '11000') return 'DATABASE_DUPLICATE'
  return 'UNAVAILABLE'
}

const sanitizeOAuthDiagnosticText = (value, maxLength) => {
  if (typeof value !== 'string') return null
  return value
    .slice(0, maxLength)
    .replace(/((?:client_secret|access_token|id_token|refresh_token|authorization_code|code_verifier|code)\s*[=:]\s*)[^&\s,]+/gi, '$1[REDACTED]')
}

const getGoogleTokenResponseDiagnostics = (error) => {
  const response = error?.response
  const body = error?.cause && typeof error.cause === 'object' ? error.cause : {}
  const oauthError = error?.error ?? body.error
  const oauthErrorDescription = error?.error_description ?? body.error_description
  const responseBody = {}

  for (const key of ['error', 'error_description', 'error_uri']) {
    const value = sanitizeOAuthDiagnosticText(body[key], key === 'error_description' ? 500 : 200)
    if (value !== null) responseBody[key] = value
  }

  return {
    httpStatus: response?.status ?? error?.status ?? null,
    contentType: response?.headers?.get?.('content-type') ?? null,
    oauthError: sanitizeOAuthDiagnosticText(oauthError, 200),
    oauthErrorDescription: sanitizeOAuthDiagnosticText(oauthErrorDescription, 500),
    sanitizedResponseBody: responseBody
  }
}

/**
 * GET /auth/google
 * Initiate Google OAuth login flow
 */
export const startGoogleAuth = asyncHandler(async (req, res) => {
  console.info('[OAuth Google] start request')
  if (!oauthConfig.isGoogleOAuthConfigured()) {
    const url = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed', 'google')
    return res.redirect(url)
  }

  try {
    const { client } = await oauthConfig.initializeGoogleClient()
    const { state, nonce } = oauthService.buildOAuthState(req, 'google')

    const authUrl = openidClient.buildAuthorizationUrl(client, {
      scope: 'openid email profile',
      redirect_uri: config.google_callback_url,
      state,
      nonce,
      prompt: 'consent'
    })

    console.info('[OAuth Google] redirecting to accounts.google.com')
    res.redirect(authUrl.href)
  } catch (error) {
    console.error('[OAuth Google] start failed', { errorType: error?.name || 'Error' })
    const url = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed', 'google')
    res.redirect(url)
  }
})

/**
 * GET /auth/google/callback
 * Handle Google OAuth callback
 */
export const handleGoogleCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query
  console.info('[OAuth Google] callback received', {
    sessionStateMatchesProvider: req.session?.oauthState?.provider === 'google',
    statePresent: Boolean(state),
    providerReturnedError: Boolean(error)
  })

  if (error) {
    const wasCancelled = String(error).toLowerCase() === 'access_denied'
    const reason = wasCancelled ? 'cancelled' : 'oauth_failed'
    console.error('[OAuth Google] provider returned error', { stage: 'provider-response', category: wasCancelled ? 'access_denied' : 'other' })
    const url = oauthService.buildFrontendCallbackUrl('error', reason, 'google')
    return res.redirect(url)
  }

  // Validate state
  const savedState = oauthService.validateOAuthState(req, 'google', String(state || ''))
  if (!savedState) {
    console.error('[OAuth Google] callback failed', { stage: 'state-validation', errorCode: 'STATE_INVALID' })
    const url = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed', 'google')
    return res.redirect(url)
  }

  const { nonce } = savedState
  oauthService.clearOAuthState(req)

  let stage = 'client-initialization'
  try {
    const { client } = await oauthConfig.initializeGoogleClient()
    const googleCallbackUrl =
      config.google_callback_url || `${req.protocol}://${req.get('host')}/auth/google/callback`

    // Exchange code for token
    stage = 'authorization-code-exchange'
    const tokenSet = await openidClient.authorizationCodeGrant(
      client,
      new URL(req.originalUrl, googleCallbackUrl),
      { expectedNonce: nonce, expectedState: String(state) }
    )
    stage = 'identity-claims'
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
    stage = 'user-resolution'
    const user = await oauthService.findOrCreateOAuthUser({
      provider: 'google',
      providerUserId: claims.sub,
      email: claims.email,
      name: claims.name || claims.given_name || 'Google User'
    })

    // Create session
    stage = 'session-save'
    await oauthService.createOAuthSession(req, user)

    // Redirect to frontend with success
    const successUrl = oauthService.buildFrontendCallbackUrl('success', '', 'google')
    // console.info('[OAuth Google] callback completed', { stage: 'complete' })
    res.redirect(successUrl)
  } catch (err) {
    const failureDetails = { stage, errorType: err?.name || 'Error', errorCode: safeOAuthErrorCode(err) }
    if (stage === 'authorization-code-exchange') {
      Object.assign(failureDetails, getGoogleTokenResponseDiagnostics(err))
    }
    console.error('[OAuth Google] callback failed', failureDetails)
    const errorUrl = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed', 'google')
    res.redirect(errorUrl)
  }
})

/**
 * GET /auth/github
 * Initiate GitHub OAuth login flow
 */
export const startGitHubAuth = asyncHandler(async (req, res) => {
  console.info('[OAuth GitHub] start request')
  if (!oauthConfig.isGitHubOAuthConfigured()) {
    const url = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed', 'github')
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

  console.info('[OAuth GitHub] redirecting to github.com')
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`)
})

/**
 * GET /auth/github/callback
 * Handle GitHub OAuth callback
 */
export const handleGitHubCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query
  console.info('[OAuth GitHub] callback received', {
    sessionStateMatchesProvider: req.session?.oauthState?.provider === 'github',
    statePresent: Boolean(state),
    providerReturnedError: Boolean(error)
  })

  if (error) {
    const wasCancelled = String(error).toLowerCase() === 'access_denied'
    const reason = wasCancelled ? 'cancelled' : 'oauth_failed'
    console.error('[OAuth GitHub] provider returned error', { stage: 'provider-response', category: wasCancelled ? 'access_denied' : 'other' })
    const url = oauthService.buildFrontendCallbackUrl('error', reason, 'github')
    return res.redirect(url)
  }

  // Validate state
  const savedState = oauthService.validateOAuthState(req, 'github', String(state || ''))
  if (!savedState) {
    console.error('[OAuth GitHub] callback failed', { stage: 'state-validation', errorCode: 'STATE_INVALID' })
    const url = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed', 'github')
    return res.redirect(url)
  }

  oauthService.clearOAuthState(req)

  let stage = 'authorization-code-exchange'
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
    stage = 'profile-fetch'
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
    stage = 'verified-email-fetch'
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
    stage = 'user-resolution'
    const user = await oauthService.findOrCreateOAuthUser({
      provider: 'github',
      providerUserId: String(githubUser.id),
      email: verifiedEmail.email,
      name: githubUser.name || githubUser.login || 'GitHub User'
    })

    // Create session
    stage = 'session-save'
    await oauthService.createOAuthSession(req, user)

    // Redirect to frontend with success
    const successUrl = oauthService.buildFrontendCallbackUrl('success', '', 'github')
    // console.info('[OAuth GitHub] callback completed', { stage: 'complete' })
    res.redirect(successUrl)
  } catch (err) {
    console.error('[OAuth GitHub] callback failed', { stage, errorType: err?.name || 'Error', errorCode: safeOAuthErrorCode(err) })
    const errorUrl = oauthService.buildFrontendCallbackUrl('error', 'oauth_failed', 'github')
    res.redirect(errorUrl)
  }
})

export default {
  startGoogleAuth,
  handleGoogleCallback,
  startGitHubAuth,
  handleGitHubCallback
}
