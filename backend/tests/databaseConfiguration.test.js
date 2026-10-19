import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  assertCadTechE2EDatabase,
  assertSafeDevelopmentDatabase,
  extractDatabaseName
} from '../src/utils/e2eDatabase.js'

test('requires the cadtech database for normal development', () => {
  assert.equal(assertSafeDevelopmentDatabase('mongodb://127.0.0.1:27017/cadtech'), 'cadtech')
  for (const name of ['', 'cadtech_dev', 'cadtech_development', 'cadtech_local', 'admin', 'cadtech-prod']) {
    assert.throws(
      () => assertSafeDevelopmentDatabase(`mongodb://127.0.0.1:27017/${name}`),
      /cadtech database/
    )
  }
})

test('E2E configuration requires exactly cadtech_e2e', () => {
  assert.equal(assertCadTechE2EDatabase('mongodb://127.0.0.1:27017/cadtech_e2e'), 'cadtech_e2e')
  assert.throws(
    () => assertCadTechE2EDatabase('mongodb://127.0.0.1:27017/cadtech_test'),
    /exactly|cadtech_e2e/
  )
  assert.equal(extractDatabaseName('mongodb://127.0.0.1:27017/cadtech'), 'cadtech')
})

test('environment loading accepts the cadtech database in development without exposing the URI', () => {
  const result = spawnSync(process.execPath, [
    '--input-type=module',
    '-e',
    'await import("./src/config/environment.js")'
  ], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/cadtech'
    }
  })
  assert.equal(result.status, 0)
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /mongodb:\/\/|password|credential/i)
})

test('environment loading rejects a missing development database target', () => {
  const result = spawnSync(process.execPath, [
    '--input-type=module',
    '-e',
    'await import("./src/config/environment.js")'
  ], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'development', MONGODB_URI: '' }
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /MONGODB_URI/)
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /mongodb:\/\/|password|credential/i)
})
