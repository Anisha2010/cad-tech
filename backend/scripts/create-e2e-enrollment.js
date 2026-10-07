import mongoose from 'mongoose'
import { assertE2EFixtureEnvironment, loadE2EEnvironment } from './e2eEnv.js'
import { Course } from '../src/models/Course.js'
import { CourseCurriculum } from '../src/models/CourseCurriculum.js'
import { Enrollment } from '../src/models/Enrollment.js'
import { User, normalizeEmail } from '../src/models/User.js'

loadE2EEnvironment()
const { mongoUri, runId } = assertE2EFixtureEnvironment()

const courseId = process.env.E2E_COURSE_ID || ''
if (!/^E2E-\d{10,}-\d+-[a-f\d]{8}$/i.test(runId) || !mongoose.isValidObjectId(courseId)) {
  throw new Error('A valid current E2E run ID and course ID are required.')
}

const healthResponse = await fetch('http://127.0.0.1:5000/health')
const health = await healthResponse.json()
if (!healthResponse.ok || health.database !== 'cadtech_e2e' || health.databaseStatus !== 'connected') {
  throw new Error('E2E fixture setup refused: backend health is not connected to cadtech_e2e.')
}

const expectedTitle = `E2E Quiz Course ${runId}`
const studentEmail = normalizeEmail(process.env.E2E_STUDENT_EMAIL)
await mongoose.connect(mongoUri)
try {
  const [student, course] = await Promise.all([
    User.findOne({ email: studentEmail, role: 'student' }).lean(),
    Course.findOne({ _id: courseId, title: expectedTitle }).lean()
  ])
  const isE2EStudent = student?.authProviders?.some((provider) =>
    provider.provider === 'e2e-fixture' && provider.providerUserId === 'e2e:student'
  )
  if (!student || !isE2EStudent) throw new Error('Configured student is not the seeded E2E student.')
  if (!course || course.status !== 'published' || course.enrollmentOpen) {
    throw new Error('Enrollment fixture requires the exact published E2E course with enrollment checkout closed.')
  }

  const curriculum = await CourseCurriculum.findOne({ courseId: course._id, status: 'published' }).lean()
  const hasPublishedLessons = curriculum?.sections?.some((section) =>
    !section.archivedAt && section.lessons?.some((lesson) => !lesson.archivedAt && lesson.isPublished !== false)
  )
  if (!hasPublishedLessons) throw new Error('Enrollment fixture requires published E2E curriculum.')

  const enrollment = await Enrollment.findOneAndUpdate(
    { userId: student._id, courseId: course._id },
    { $setOnInsert: { userId: student._id, courseId: course._id, paymentId: null, status: 'active', progressPercentage: 0, lessonProgress: [], enrolledAt: new Date(), lastAccessedAt: null, completedAt: null } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean()
  if (!enrollment || !['active', 'completed'].includes(enrollment.status)) {
    throw new Error('Unable to establish the active E2E enrollment fixture.')
  }
  process.stdout.write(`${JSON.stringify({ enrollmentId: String(enrollment._id), courseId: String(course._id) })}\n`)
} finally {
  await mongoose.disconnect()
}