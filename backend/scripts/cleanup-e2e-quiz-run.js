import mongoose from 'mongoose'
import { assertE2EFixtureEnvironment, loadE2EEnvironment } from './e2eEnv.js'
import { Course } from '../src/models/Course.js'
import { CourseCurriculum } from '../src/models/CourseCurriculum.js'
import { Enrollment } from '../src/models/Enrollment.js'
import { Quiz } from '../src/models/Quiz.js'
import { QuizAttempt } from '../src/models/QuizAttempt.js'
import { User, normalizeEmail } from '../src/models/User.js'

loadE2EEnvironment()
const { mongoUri, runId } = assertE2EFixtureEnvironment()

const healthResponse = await fetch('http://127.0.0.1:5000/health')
const health = await healthResponse.json()
if (!healthResponse.ok || health.database !== 'cadtech_e2e' || health.databaseStatus !== 'connected') {
  throw new Error('E2E cleanup refused: backend health is not connected to cadtech_e2e.')
}

await mongoose.connect(mongoUri)
try {
  const student = await User.findOne({ email: normalizeEmail(process.env.E2E_STUDENT_EMAIL), role: 'student' }).lean()
  const isE2EStudent = student?.authProviders?.some((provider) =>
    provider.provider === 'e2e-fixture' && provider.providerUserId === 'e2e:student'
  )
  if (!student || !isE2EStudent) throw new Error('Cleanup refused: configured student is not the seeded E2E student.')

  const course = await Course.findOne({ title: `E2E Quiz Course ${runId}`, slug: `e2e-quiz-course-${runId.toLowerCase()}` })
  if (!course) {
    process.stdout.write(`${JSON.stringify({ attempts: 0, enrollment: 0, quizzes: 0, curriculum: 0, coursesArchived: 0 })}\n`)
  } else {
    const quizzes = await Quiz.find({ courseId: course._id, title: `E2E Quiz ${runId}` }).select('_id').lean()
    const quizIds = quizzes.map((quiz) => quiz._id)
    const attemptsResult = quizIds.length
      ? await QuizAttempt.deleteMany({ quizId: { $in: quizIds }, studentId: student._id })
      : { deletedCount: 0 }
    const enrollmentResult = await Enrollment.deleteOne({ userId: student._id, courseId: course._id })
    const quizResult = quizIds.length
      ? await Quiz.deleteMany({ _id: { $in: quizIds }, courseId: course._id, title: `E2E Quiz ${runId}` })
      : { deletedCount: 0 }
    const curriculumResult = await CourseCurriculum.deleteOne({ courseId: course._id, courseSlug: course.slug })
    const archiveResult = await Course.updateOne(
      { _id: course._id, title: `E2E Quiz Course ${runId}` },
      { $set: { status: 'archived', enrollmentOpen: false } }
    )
    process.stdout.write(`${JSON.stringify({
      attempts: attemptsResult.deletedCount || 0,
      enrollment: enrollmentResult.deletedCount || 0,
      quizzes: quizResult.deletedCount || 0,
      curriculum: curriculumResult.deletedCount || 0,
      coursesArchived: archiveResult.modifiedCount || 0
    })}\n`)
  }
} finally {
  await mongoose.disconnect()
}