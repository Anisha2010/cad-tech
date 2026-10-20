import mongoose from 'mongoose'
import { assertE2EFixtureEnvironment, loadE2EEnvironment } from './e2eEnv.js'
import { CadService } from '../src/models/CadService.js'

loadE2EEnvironment()
const { mongoUri, runId } = assertE2EFixtureEnvironment()

if (process.env.E2E_MODE !== 'true') {
  throw new Error('E2E service cleanup refused: E2E_MODE must be "true".')
}

const healthResponse = await fetch('http://127.0.0.1:5000/health')
const health = await healthResponse.json()
if (!healthResponse.ok || health.database !== 'cadtech_e2e' || health.databaseStatus !== 'connected') {
  throw new Error('E2E service cleanup refused: backend health is not connected to cadtech_e2e.')
}

const escapedRunId = runId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const marker = { $regex: escapedRunId }

await mongoose.connect(mongoUri)
try {
  if (mongoose.connection.name !== 'cadtech_e2e') {
    throw new Error('E2E service cleanup refused: connected database is not cadtech_e2e.')
  }

  const filter = {
    $or: [
      { slug: marker },
      { title: marker },
      { shortDescription: marker },
      { description: marker }
    ]
  }

  const matched = await CadService.find(filter).select('_id slug').lean()
  if (matched.length === 0) {
    process.stdout.write(`${JSON.stringify({ matched: 0, deleted: 0 })}\n`)
  } else {
    const result = await CadService.deleteMany(filter)
    process.stdout.write(`${JSON.stringify({ matched: matched.length, deleted: result.deletedCount || 0 })}\n`)
  }
} finally {
  await mongoose.disconnect()
}
