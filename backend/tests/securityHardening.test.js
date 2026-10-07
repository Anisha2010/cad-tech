import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'

import app from '../src/app.js'

test('app includes production security headers', async () => {
  const server = app.listen(0)
  await once(server, 'listening')

  try {
    const { port } = server.address()
    const response = await fetch(`http://127.0.0.1:${port}/health`)

    assert.equal(response.headers.get('x-dns-prefetch-control'), 'off')
    assert.equal(response.headers.get('x-frame-options'), 'DENY')
    assert.equal(response.headers.get('x-powered-by'), null)
  } finally {
    server.close()
  }
})

test('auth login endpoint rate limits repeated requests', async () => {
  const server = app.listen(0)
  await once(server, 'listening')

  try {
    const { port } = server.address()
    const requests = Array.from({ length: 11 }, () => fetch(`http://127.0.0.1:${port}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'password' })
    }))

    const responses = await Promise.all(requests)
    const tooManyRequests = responses.some((response) => response.status === 429)

    assert.equal(tooManyRequests, true)
  } finally {
    server.close()
  }
})
