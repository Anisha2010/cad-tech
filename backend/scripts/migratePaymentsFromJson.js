import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import config from '../src/config/environment.js'
import { connectDatabase, disconnectDatabase } from '../src/config/database.js'
import { Course } from '../src/models/Course.js'
import { Payment } from '../src/models/Payment.js'
import { User } from '../src/models/User.js'

const source = path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/payments.json')
const allowedStatuses = new Set(['created', 'pending', 'paid', 'failed', 'refunded'])
const validProviderPaymentId = (value) => typeof value === 'string' && /^pay_[A-Za-z0-9]+$/.test(value)

const readSource = async () => {
  const parsed = JSON.parse(await fs.readFile(source, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error('payments.json must contain an array')
  return parsed
}

const resolveUser = async (legacyUserId) => {
  if (mongoose.isValidObjectId(legacyUserId)) return User.findById(legacyUserId)
  return User.findOne({ legacyId: String(legacyUserId || '') })
}

const migrate = async () => {
  if (!config.mongodb_uri) throw new Error('MONGODB_URI environment variable is required')
  const records = await readSource()
  await connectDatabase()
  const totals = { total: records.length, valid: 0, wouldWrite: 0, written: 0, skipped: 0, requiresReview: 0 }
  const execute = process.argv.includes('--execute')
  for (const record of records) {
    const amountInPaise = Number(record.amountInPaise ?? record.amount)
    const status = String(record.status || '').toLowerCase()
    const providerOrderId = String(record.providerOrderId || '')
    if (!Number.isInteger(amountInPaise) || amountInPaise <= 0 || !allowedStatuses.has(status) || !providerOrderId) {
      totals.skipped += 1
      continue
    }
    const [user, course] = await Promise.all([resolveUser(record.userId), Course.findOne({ slug: String(record.courseSlug || '').trim().toLowerCase() })])
    if (!user || !course) {
      totals.skipped += 1
      continue
    }
    const providerPaymentId = validProviderPaymentId(record.providerPaymentId) ? record.providerPaymentId : null
    const requiresReview = status === 'paid' || Boolean(record.requiresReview) || Boolean(record.providerPaymentId && !providerPaymentId)
    totals.valid += 1
    totals.wouldWrite += 1
    if (requiresReview) totals.requiresReview += 1
    if (execute) {
      await Payment.updateOne({ providerOrderId }, {
        $setOnInsert: {
          userId: user._id,
          courseId: course._id,
          enrollmentId: null,
          provider: 'razorpay',
          providerOrderId,
          providerPaymentId,
          receipt: String(record.receipt || `legacy_${providerOrderId}`),
          amountInPaise,
          currency: String(record.currency || course.currency || 'INR').toUpperCase(),
          status,
          verifiedAt: status === 'paid' ? (record.updatedAt || record.createdAt || null) : null,
          failedAt: status === 'failed' ? (record.updatedAt || null) : null,
          failureCode: null,
          failureDescription: null,
          legacyId: record.id ? String(record.id) : null,
          requiresReview
        }
      }, { upsert: true })
      totals.written += 1
    }
  }
  console.log(JSON.stringify({ mode: execute ? 'execute' : 'dry-run', ...totals }))
}

migrate().catch((error) => {
  console.error('Payment migration failed:', error.message)
  process.exitCode = 1
}).finally(disconnectDatabase)
