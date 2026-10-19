import test from 'node:test'
import assert from 'node:assert/strict'
import { cadOrderReservationIndexes, verifyCadOrderReservationIndexes } from '../src/utils/cadOrderReservationIndexes.js'
import {
  assertCadOrderMigrationTarget,
  auditCadOrderReservationConflicts,
  migrateCadOrderReservationIndexes
} from '../scripts/migrateCadOrderReservations.js'

test('shared cadtech index creation requires explicit approval', () => {
  assert.throws(
    () => assertCadOrderMigrationTarget({ databaseName: 'cadtech', apply: true }),
    /without explicit approval/
  )
  assert.doesNotThrow(() => assertCadOrderMigrationTarget({
    databaseName: 'cadtech',
    apply: true,
    allowSharedMigration: true
  }))
  assert.doesNotThrow(() => assertCadOrderMigrationTarget({ databaseName: 'cadtech', apply: false }))
})

test('reservation index verification requires exact unique partial index definitions', async () => {
  const indexes = cadOrderReservationIndexes.map(({ key, options }) => ({
    key,
    name: options.name,
    unique: true,
    partialFilterExpression: options.partialFilterExpression
  }))
  await verifyCadOrderReservationIndexes({ indexes: async () => indexes })
  await assert.rejects(
    () => verifyCadOrderReservationIndexes({ conn: { name: 'cadtech_local' }, indexes: async () => indexes.slice(1) }),
    (error) => error.message.includes('cadorder_user_idempotency_unique') &&
      error.message.includes('cadtech_local') &&
      error.message.includes('migrate:cad-orders:check') &&
      error.message.includes('migrate:cad-orders')
  )
})

test('migration audit returns only conflict counts and blocks index creation when duplicates exist', async () => {
  const createdIndexes = []
  const collection = {
    aggregate: (pipeline) => ({
      toArray: async () => pipeline[0].$match.idempotencyKey ? [{ groups: 1 }] : []
    }),
    createIndex: async (...args) => createdIndexes.push(args)
  }

  const audit = await auditCadOrderReservationConflicts(collection)
  assert.deepEqual(audit, { idempotencyConflictGroups: 1, activeOrderConflictGroups: 0 })
  const migration = await migrateCadOrderReservationIndexes({ collection, apply: true })
  assert.equal(migration.mode, 'blocked')
  assert.equal(createdIndexes.length, 0)
})

test('migration creates only the declared reservation indexes after a clean audit', async () => {
  const createdIndexes = []
  const collection = {
    aggregate: () => ({ toArray: async () => [] }),
    createIndex: async (...args) => createdIndexes.push(args)
  }

  const migration = await migrateCadOrderReservationIndexes({ collection, apply: true })
  assert.equal(migration.mode, 'indexes-created')
  assert.equal(createdIndexes.length, 2)
  assert.deepEqual(createdIndexes, cadOrderReservationIndexes.map(({ key, options }) => [key, options]))
})
