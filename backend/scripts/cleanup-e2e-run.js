import mongoose from 'mongoose'
import { loadE2EEnvironment } from './e2eEnv.js'
import { assertSafeE2EDatabase } from '../src/utils/e2eDatabase.js'

const { mongoUri } = loadE2EEnvironment()
assertSafeE2EDatabase(mongoUri)
const runId = process.env.E2E_RUN_ID || ''
if (!/^E2E-\d{10,}-[A-Za-z0-9]{4,}$/.test(runId)) {
  throw new Error('E2E_RUN_ID must use the current run format: E2E-{timestamp}-{randomSuffix}.')
}

const escapedRunId = runId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const fields = ['title', 'name', 'slug', 'reference', 'subject', 'message', 'description', 'shortDescription', 'courseTitle', 'externalReference', 'runId']
const collections = ['courses', 'faqs', 'testimonials', 'contactenquiries', 'cadproducts', 'cadserviceenquiries', 'cadservicequotations', 'cadservicemessages', 'cadorders']

await mongoose.connect(mongoUri)
try {
  for (const collectionName of collections) {
    const collection = mongoose.connection.db.collection(collectionName)
    const filter = { $or: fields.map((field) => ({ [field]: { $regex: escapedRunId } })) }
    const result = await collection.deleteMany(filter)
    if (result.deletedCount > 0) console.log(`${collectionName}: ${result.deletedCount} removed`)
  }
} finally {
  await mongoose.disconnect()
}