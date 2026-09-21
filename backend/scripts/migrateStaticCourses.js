import 'dotenv/config'
import courses from '../src/config/courses.js'
import { connectDatabase, disconnectDatabase } from '../src/config/database.js'
import { Course } from '../src/models/Course.js'
import { User } from '../src/models/User.js'

const dryRun = process.argv.includes('--dry-run')

const normalizeCourseRecord = (source, adminId) => ({
  title: source.title,
  shortDescription: source.shortDescription,
  description: source.description || source.shortDescription,
  category: source.category,
  software: source.software,
  level: source.level,
  duration: source.duration || null,
  lessonCount: Number.isInteger(source.lessons) ? source.lessons : null,
  thumbnailUrl: source.thumbnailUrl || source.image || null,
  priceInPaise: Number.isInteger(source.priceInPaise) && source.priceInPaise > 0 ? source.priceInPaise : null,
  currency: 'INR',
  enrollmentOpen: Boolean(source.enrollmentOpen) && Number.isInteger(source.priceInPaise) && source.priceInPaise > 0,
  status: ['draft', 'published', 'archived'].includes(source.status) ? source.status : 'draft',
  createdBy: adminId,
  updatedBy: adminId
})

const migrate = async () => {
  await connectDatabase()

  const admin = await User.findOne({ role: 'admin' }).select('_id').lean()
  if (!admin) throw new Error('Create an admin user before migrating courses.')

  const adminId = String(admin._id)
  let created = 0
  let updated = 0
  let unchanged = 0

  for (const source of courses) {
    const nextRecord = normalizeCourseRecord(source, adminId)
    const existing = await Course.findOne({ slug: source.slug }).lean()

    if (!existing) {
      if (dryRun) {
        created += 1
        continue
      }
      await Course.create(nextRecord)
      created += 1
      continue
    }

    const hasChanges = Object.entries(nextRecord).some(([key, value]) => {
      const currentValue = existing[key]
      return JSON.stringify(currentValue) !== JSON.stringify(value)
    })

    if (!hasChanges) {
      unchanged += 1
      continue
    }

    if (dryRun) {
      updated += 1
      continue
    }

    await Course.updateOne({ _id: existing._id }, { $set: nextRecord })
    updated += 1
  }

  const summary = dryRun
    ? `Dry run complete: ${created} would be created, ${updated} would be updated, ${unchanged} unchanged.`
    : `Course migration complete: ${created} created, ${updated} updated, ${unchanged} unchanged.`

  console.log(summary)
}

migrate().catch((error) => {
  console.error(`Course migration failed: ${error.message}`)
  process.exitCode = 1
}).finally(() => disconnectDatabase().catch(() => { }))
