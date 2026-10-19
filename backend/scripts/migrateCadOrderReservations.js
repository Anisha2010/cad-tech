import { pathToFileURL } from 'node:url'
import config from '../src/config/environment.js'
import { connectDatabase, disconnectDatabase } from '../src/config/database.js'
import { CadOrder } from '../src/models/CadOrder.js'
import { cadOrderReservationIndexes } from '../src/utils/cadOrderReservationIndexes.js'
import { getSafeMongoErrorDetails } from '../src/utils/safeMongoErrorDetails.js'

export const auditCadOrderReservationConflicts = async (collection) => {
  const [idempotencyConflicts, reservationConflicts] = await Promise.all([
    collection.aggregate([
      { $match: { idempotencyKey: { $type: 'string' } } },
      { $group: { _id: { userId: '$userId', idempotencyKey: '$idempotencyKey' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'groups' }
    ]).toArray(),
    collection.aggregate([
      { $match: { reservationKey: { $type: 'string' } } },
      { $group: { _id: '$reservationKey', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'groups' }
    ]).toArray()
  ])

  return {
    idempotencyConflictGroups: idempotencyConflicts[0]?.groups || 0,
    activeOrderConflictGroups: reservationConflicts[0]?.groups || 0
  }
}

export const migrateCadOrderReservationIndexes = async ({ collection, apply = false }) => {
  const conflicts = await auditCadOrderReservationConflicts(collection)
  if (conflicts.idempotencyConflictGroups || conflicts.activeOrderConflictGroups) {
    return { mode: 'blocked', ...conflicts }
  }
  if (!apply) return { mode: 'audit-only', ...conflicts }

  for (const { key, options } of cadOrderReservationIndexes) {
    await collection.createIndex(key, options)
  }
  return { mode: 'indexes-created', ...conflicts }
}

export const assertCadOrderMigrationTarget = ({ databaseName, apply, allowSharedMigration = false }) => {
  if (apply && databaseName === 'cadtech' && !allowSharedMigration) {
    throw new Error(
      'Refusing to apply CAD reservation indexes to shared cadtech without explicit approval. Set ALLOW_SHARED_CADTECH_INDEX_MIGRATION=true only after approval.'
    )
  }
}

const runMigration = async () => {
  if (!config.mongodb_uri) throw new Error('MONGODB_URI environment variable is required')
  assertCadOrderMigrationTarget({
    databaseName: config.mongodb_database,
    apply: process.argv.includes('--apply'),
    allowSharedMigration: process.env.ALLOW_SHARED_CADTECH_INDEX_MIGRATION === 'true'
  })
  await connectDatabase()
  const result = await migrateCadOrderReservationIndexes({
    collection: CadOrder.collection,
    apply: process.argv.includes('--apply')
  })
  console.log(JSON.stringify(result))
  if (result.mode === 'blocked') process.exitCode = 2
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runMigration()
  } catch (error) {
    const knownSafeMessages = new Set([
      'MONGODB_URI environment variable is required',
      'Refusing to apply CAD reservation indexes to shared cadtech without explicit approval. Set ALLOW_SHARED_CADTECH_INDEX_MIGRATION=true only after approval.'
    ])
    console.error('[Migration] CAD order reservation migration failed.', {
      message: knownSafeMessages.has(error.message) ? error.message : 'Database operation failed.',
      ...getSafeMongoErrorDetails(error)
    })
    process.exitCode = 1
  } finally {
    try {
      await disconnectDatabase()
    } catch (error) {
      console.error('[Migration] MongoDB cleanup failed.', getSafeMongoErrorDetails(error))
      process.exitCode = 1
    }
  }
}
