import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import express from 'express'
import authRoutes from '../src/routes/authRoutes.js'

test('profile and password endpoints require an authenticated session', async () => {
  const app = express()
  app.use(express.json())
  app.use('/auth', authRoutes)
  const server = app.listen(0)
  await once(server, 'listening')

  try {
    const { port } = server.address()
    const requests = [
      fetch(`http://127.0.0.1:${port}/auth/profile`),
      fetch(`http://127.0.0.1:${port}/auth/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Name' }) }),
      fetch(`http://127.0.0.1:${port}/auth/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: 'secret', password: 'StrongPassword7!', confirmPassword: 'StrongPassword7!' }) })
    ]
    const responses = await Promise.all(requests)
    assert.deepEqual(responses.map((response) => response.status), [401, 401, 401])
    assert.deepEqual(await Promise.all(responses.map((response) => response.json())).then((bodies) => bodies.map((body) => body.message)), [
      'Authentication required.',
      'Authentication required.',
      'Authentication required.'
    ])
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})

test('email-auth endpoints reject malformed input before database access', async () => {
  const app = express()
  app.use(express.json())
  app.use('/auth', authRoutes)
  const server = app.listen(0)
  await once(server, 'listening')

  try {
    const { port } = server.address()
    const base = `http://127.0.0.1:${port}/auth`
    const cases = [
      ['/otp/request', { email: 'invalid' }],
      ['/otp/verify', { email: 'person@example.com', otp: '12x' }],
      ['/verify-email', { token: 'short' }],
      ['/verification/resend', { email: 'invalid' }]
    ]
    const responses = await Promise.all(cases.map(([path, body]) => fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })))
    assert.deepEqual(responses.map((response) => response.status), [400, 400, 400, 400])
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})