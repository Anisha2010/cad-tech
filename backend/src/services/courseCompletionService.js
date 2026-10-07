import mongoose from 'mongoose'
import { Course } from '../models/Course.js'
import { CourseCurriculum } from '../models/CourseCurriculum.js'
import { Enrollment } from '../models/Enrollment.js'
import { Quiz } from '../models/Quiz.js'
import { QuizAttempt } from '../models/QuizAttempt.js'
import { Assignment } from '../models/Assignment.js'
import { AssignmentSubmission } from '../models/AssignmentSubmission.js'
import { AppError } from '../utils/AppError.js'

const isValidObjectId = (value) => mongoose.isValidObjectId(value)

const normalizeCompletionCount = (value) => Number.isFinite(Number(value)) ? Number(value) : 0

const isRequiredLesson = (lesson) => {
  if (!lesson || !lesson.id) return false
  return lesson.required !== false && lesson.isPublished !== false && !lesson.archivedAt
}

const isRequiredQuiz = (quiz) => {
  if (!quiz || !quiz._id) return false
  return quiz.required !== false && quiz.publicationStatus === 'published' && quiz.reviewStatus === 'approved' && !quiz.archivedAt
}

const isRequiredAssignment = (assignment) => {
  if (!assignment || !assignment._id) return false
  return assignment.required !== false && assignment.publicationStatus === 'published' && assignment.reviewStatus === 'approved' && !assignment.archivedAt
}

const isSubmissionComplete = (assignment, submission) => {
  if (!submission) return false
  if (submission.status === 'graded') return true
  if (submission.status === 'submitted' || submission.status === 'late') {
    return Boolean(assignment && assignment.allowedSubmissionTypes && assignment.allowedSubmissionTypes.length > 0)
  }
  return false
}

export const calculateCourseCompletion = async ({ studentId, courseId, enrollment = null }) => {
  if (!isValidObjectId(studentId) || !isValidObjectId(courseId)) {
    return {
      eligible: false,
      progressPercentage: 0,
      lessons: { required: 0, completed: 0 },
      quizzes: { required: 0, passed: 0 },
      assignments: { required: 0, completed: 0 },
      blockers: []
    }
  }

  const [course, enrollmentDoc] = await Promise.all([
    Course.findById(courseId).lean(),
    enrollment || Enrollment.findOne({ userId: new mongoose.Types.ObjectId(String(studentId)), courseId: new mongoose.Types.ObjectId(String(courseId)), status: { $in: ['active', 'completed'] } }).lean()
  ])

  if (!course) {
    throw new AppError('Course not found.', 404)
  }

  if (!enrollmentDoc) {
    throw new AppError('You are not enrolled in this course.', 404)
  }

  const curriculum = await CourseCurriculum.findOne({ courseId: new mongoose.Types.ObjectId(String(courseId)), status: 'published' }).lean()
  const lessonProgressMap = new Map()
  for (const entry of Array.isArray(enrollmentDoc.lessonProgress) ? enrollmentDoc.lessonProgress : []) {
    if (!entry || !entry.lessonId) continue
    lessonProgressMap.set(String(entry.lessonId), entry)
  }

  const requiredLessons = []
  for (const section of Array.isArray(curriculum?.sections) ? curriculum.sections : []) {
    if (section?.isPublished === false || section?.archivedAt) continue
    for (const lesson of Array.isArray(section.lessons) ? section.lessons : []) {
      if (isRequiredLesson(lesson)) requiredLessons.push(lesson)
    }
  }

  const completedLessonCount = requiredLessons.filter((lesson) => {
    const progress = lessonProgressMap.get(String(lesson.id))
    return progress && String(progress.status || '').toLowerCase() === 'completed'
  }).length

  const blockers = []
  for (const lesson of requiredLessons) {
    const progress = lessonProgressMap.get(String(lesson.id))
    if (!progress || String(progress.status || '').toLowerCase() !== 'completed') {
      blockers.push({
        type: 'lesson',
        id: String(lesson.id),
        title: lesson.title || 'Lesson',
        message: 'Complete the required lesson before earning your certificate.'
      })
    }
  }

  const requiredQuizzes = await Quiz.find({
    courseId: new mongoose.Types.ObjectId(String(courseId)),
    publicationStatus: 'published',
    reviewStatus: 'approved',
    archivedAt: null,
    required: { $ne: false }
  }).lean()

  const passedQuizCount = await Promise.all(requiredQuizzes.map(async (quiz) => {
    const attempt = await QuizAttempt.findOne({
      studentId: new mongoose.Types.ObjectId(String(studentId)),
      quizId: new mongoose.Types.ObjectId(String(quiz._id)),
      passed: true,
      status: { $in: ['submitted', 'expired'] }
    }).sort({ submittedAt: -1, createdAt: -1 }).lean()

    if (!attempt) {
      blockers.push({
        type: 'quiz',
        id: String(quiz._id),
        title: quiz.title || 'Quiz',
        message: 'Pass the required quiz before earning your certificate.'
      })
      return false
    }

    return true
  }))

  const requiredAssignments = await Assignment.find({
    courseId: new mongoose.Types.ObjectId(String(courseId)),
    publicationStatus: 'published',
    reviewStatus: 'approved',
    archivedAt: null,
    required: { $ne: false }
  }).lean()

  const completedAssignments = await Promise.all(requiredAssignments.map(async (assignment) => {
    const submission = await AssignmentSubmission.findOne({
      studentId: new mongoose.Types.ObjectId(String(studentId)),
      assignmentId: new mongoose.Types.ObjectId(String(assignment._id))
    }).sort({ createdAt: -1 }).lean()

    const isCompleted = isSubmissionComplete(assignment, submission)
    if (!isCompleted) {
      blockers.push({
        type: 'assignment',
        id: String(assignment._id),
        title: assignment.title || 'Assignment',
        message: 'Complete and submit the required assignment before earning your certificate.'
      })
      return false
    }

    return true
  }))

  const requiredTotal = requiredLessons.length + requiredQuizzes.length + requiredAssignments.length
  const completedTotal = completedLessonCount + passedQuizCount.filter(Boolean).length + completedAssignments.filter(Boolean).length
  const progressPercentage = requiredTotal > 0 ? Math.min(100, Math.round((completedTotal / requiredTotal) * 100)) : (course.certificateEnabled ? 100 : 0)
  const eligible = requiredTotal === 0 ? Boolean(course.certificateEnabled) : blockers.length === 0

  return {
    eligible,
    progressPercentage: normalizeCompletionCount(progressPercentage),
    lessons: {
      required: requiredLessons.length,
      completed: completedLessonCount
    },
    quizzes: {
      required: requiredQuizzes.length,
      passed: passedQuizCount.filter(Boolean).length
    },
    assignments: {
      required: requiredAssignments.length,
      completed: completedAssignments.filter(Boolean).length
    },
    blockers: blockers.slice(0, 50)
  }
}

export const ensureCourseCompletionEligibility = async ({ studentId, courseId }) => {
  if (!isValidObjectId(studentId) || !isValidObjectId(courseId)) {
    throw new AppError('Invalid course reference.', 400)
  }

  const course = await Course.findById(courseId).lean()
  if (!course) throw new AppError('Course not found.', 404)

  const enrollment = await Enrollment.findOne({
    userId: new mongoose.Types.ObjectId(String(studentId)),
    courseId: new mongoose.Types.ObjectId(String(courseId)),
    status: { $in: ['active', 'completed'] }
  }).lean()

  if (!enrollment) {
    throw new AppError('You are not enrolled in this course.', 404)
  }

  const completion = await calculateCourseCompletion({ studentId, courseId, enrollment })
  if (!completion.eligible) {
    throw new AppError('Complete all required course activities before requesting your certificate.', 422)
  }

  return { completion, enrollment, course }
}

export default {
  calculateCourseCompletion,
  ensureCourseCompletionEligibility
}
