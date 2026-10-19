import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import app from '../src/app.js'

test('health and readiness report unavailable until MongoDB is connected', async () => {
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`
    const [health, readiness] = await Promise.all([
      fetch(`${baseUrl}/health`),
      fetch(`${baseUrl}/ready`)
    ])
    const healthBody = await health.json()
    const readinessBody = await readiness.json()

    assert.equal(health.status, 503)
    assert.equal(healthBody.database, null)
    assert.equal(healthBody.databaseStatus, 'disconnected')
    assert.equal(readiness.status, 503)
    assert.equal(readinessBody.status, 'not_ready')
    assert.equal(readinessBody.cadOrderReservationIndexes, 'not_checked')
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})
