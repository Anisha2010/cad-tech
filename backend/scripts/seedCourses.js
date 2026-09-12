import { connectDatabase, disconnectDatabase } from '../src/config/database.js'
import courses from '../src/config/courses.js'
import { Course } from '../src/models/Course.js'

const seed = async () => {
  await connectDatabase()
  for (const course of courses) {
    await Course.updateOne({ slug: course.slug }, {
      $setOnInsert: {
        slug: course.slug,
        title: course.title,
        shortDescription: course.shortDescription,
        software: course.software,
        category: course.category,
        level: course.level,
        duration: course.duration,
        lessonsCount: course.lessons,
        image: course.image,
        priceInPaise: course.priceInPaise,
        currency: course.currency,
        enrollmentOpen: course.enrollmentOpen,
        status: course.status
      }
    }, { upsert: true })
  }
  console.log(`Seeded ${courses.length} course records.`)
}

seed().catch((error) => {
  console.error('Course seed failed:', error.message)
  process.exitCode = 1
}).finally(disconnectDatabase)