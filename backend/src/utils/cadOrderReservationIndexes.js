import { isDeepStrictEqual } from 'node:util'

export const cadOrderReservationIndexes = [
  {
    key: { userId: 1, idempotencyKey: 1 },
    options: {
      name: 'cadorder_user_idempotency_unique',
      unique: true,
      partialFilterExpression: { idempotencyKey: { $type: 'string' } }
    }
  },
  {
    key: { reservationKey: 1 },
    options: {
      name: 'cadorder_active_order_unique',
      unique: true,
      partialFilterExpression: { reservationKey: { $type: 'string' } }
    }
  }
]

export const verifyCadOrderReservationIndexes = async (collection) => {
  const indexes = await collection.indexes()
  const missing = cadOrderReservationIndexes.filter(({ key, options }) => !indexes.some((index) =>
    index.name === options.name &&
    index.unique === true &&
    isDeepStrictEqual(index.key, key) &&
    isDeepStrictEqual(index.partialFilterExpression, options.partialFilterExpression)
  ))

  if (missing.length) {
    const databaseName = collection.conn?.name || collection.collection?.db?.databaseName || 'unknown'
    const environment = process.env.NODE_ENV || 'development'
    throw new Error(
      `Required CAD order reservation indexes are missing or misconfigured for database "${databaseName}" in NODE_ENV="${environment}": ${missing.map(({ options }) => options.name).join(', ')}. Confirm the target database, then run "npm run migrate:cad-orders:check" for an audit. Index creation requires separate approval; after approval, run "npm run migrate:cad-orders" against the verified target.`
    )
  }
}
