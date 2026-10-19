import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEmailVerificationUrl, normalizeFrontendOrigin } from '../src/utils/emailVerificationUrl.js'

test('builds local and production verification URLs from the configured frontend origin', () => {
  const token = 'a'.repeat(43)
  const localUrl = new URL(buildEmailVerificationUrl('http://localhost:5173/', token))
  assert.equal(localUrl.origin, 'http://localhost:5173')
  assert.equal(localUrl.pathname, '/verify-email')
  assert.equal(localUrl.searchParams.get('token'), token)

  const productionUrl = new URL(buildEmailVerificationUrl('https://cadtech.vercel.app/', token, { production: true }))
  assert.equal(productionUrl.origin, 'https://cadtech.vercel.app')
  assert.equal(productionUrl.pathname, '/verify-email')
  assert.equal(productionUrl.searchParams.get('token'), token)
  assert.notEqual(productionUrl.hostname, 'localhost')
})

test('uses URL query encoding for a token and normalizes the origin', () => {
  const token = 'opaque+token /with?reserved&characters'
  const generatedUrl = buildEmailVerificationUrl('https://cadtech.vercel.app', token)
  assert.match(generatedUrl, /%2B/)
  assert.match(generatedUrl, /%2F/)
  assert.equal(new URL(generatedUrl).searchParams.get('token'), token)
  assert.equal(normalizeFrontendOrigin('http://127.0.0.1:5174/'), 'http://127.0.0.1:5174')
})

test('fails clearly for missing or invalid frontend origins', () => {
  for (const frontendUrl of ['', undefined, 'not a url', 'ftp://cadtech.example', 'http://user:pass@localhost:5173', 'http://localhost:5173/app', 'https://cadtech.example?preview=1']) {
    assert.throws(() => buildEmailVerificationUrl(frontendUrl, 'a'.repeat(43)), /FRONTEND_URL/)
  }
})

test('production origins must be public HTTPS and can never point to localhost', () => {
  for (const frontendUrl of ['http://cadtech.vercel.app', 'https://localhost:5173', 'https://127.0.0.1:5173', 'https://192.168.1.5', 'https://app.localhost', 'https://cadtech.example']) {
    assert.throws(
      () => buildEmailVerificationUrl(frontendUrl, 'a'.repeat(43), { production: true }),
      /public HTTPS origin/
    )
  }
})
