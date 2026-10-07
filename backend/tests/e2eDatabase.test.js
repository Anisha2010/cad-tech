import test from 'node:test'
import assert from 'node:assert/strict'
import { assertSafeE2EDatabase, extractDatabaseName } from '../src/utils/e2eDatabase.js'

test('extracts database name from MongoDB URIs', () => {
  assert.equal(extractDatabaseName('mongodb://localhost:27017/cadtech_e2e'), 'cadtech_e2e')
  assert.equal(extractDatabaseName('mongodb+srv://user:secret@example.invalid/cadtech-test?retryWrites=true'), 'cadtech-test')
})

test('accepts isolated E2E/test names and rejects unsafe database names', () => {
  assert.equal(assertSafeE2EDatabase('mongodb://localhost:27017/cadtech_e2e'), 'cadtech_e2e')
  assert.equal(assertSafeE2EDatabase('mongodb://localhost:27017/cadtech_test'), 'cadtech_test')
  for (const name of ['', 'cadtech', 'admin', 'local', 'production', 'cadtech-prod']) {
    assert.throws(() => assertSafeE2EDatabase(`mongodb://localhost:27017/${name}`), /database name containing e2e or test/)
  }
})