import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectDatabase, disconnectDatabase } from '../src/config/database.js'
import { Course } from '../src/models/Course.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const staticCoursePath = path.resolve(__dirname, '../src/config/courses.js')

const toSlug = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const migrate = async () => {
  await connectDatabase()

  const fileContents = await fs.readFile(staticCoursePath, 'utf8')
  const exportMatch = fileContents.match(/export default\s*\[(.*)\]\s*;?\s*$/s)
  if (!exportMatch) {
    throw new Error('Static course catalog export not found.')
  }

  const source = exportMatch[1]
  const courses = []
  const safeSource = source.replace(/\bconst courses =\s*\[/, '[')
  // eslint-disable-next-line no-eval
  const staticCourses = eval(`(${safeSource})`)

  for (const course of staticCourses) {
    const slug = toSlug(course.slug || course.title)
    if (!slug) continue

    await Course.updateOne(
      { slug },
      {
        $set: {
          title: course.title,
          shortDescription: course.shortDescription || course.description || '',
          description: course.description || course.shortDescription || '',
          category: course.category || 'General',
          software: course.software || 'General CAD',
          level: ['Beginner', 'Intermediate', 'Advanced'].includes(course.level) ? course.level : 'Beginner',
          duration: course.duration || null,
          lessonCount: Number.isInteger(course.lessons) ? course.lessons : 0,
          thumbnailUrl: course.image || null,
          priceInPaise: course.priceInPaise ?? null,
          currency: 'INR',
          enrollmentOpen: Boolean(course.enrollmentOpen) && Number.isInteger(course.priceInPaise) && course.priceInPaise > 0,
          status: course.status === 'draft' || course.status === 'archived' ? course.status : 'published',
          updatedAt: new Date()
        },
        $setOnInsert: {
          slug,
          createdAt: new Date(),
          createdBy: null,
          updatedBy: null
        }
      },
      { upsert: true }
    )

    courses.push({ slug, status: course.status === 'draft' || course.status === 'archived' ? course.status : 'published' })
  }

  console.log(`Migration complete. Updated ${courses.length} course records.`)
  console.log('Migration summary: safe static course catalog migrated to MongoDB without assigning new prices.')
}

migrate().catch((error) => {
  console.error('Course migration failed:', error.message)
  process.exitCode = 1
}).finally(() => {
  disconnectDatabase().catch(() => { })
})
