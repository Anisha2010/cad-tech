import mongoose from 'mongoose'
import { Quiz, serializeQuiz, serializeQuizPublic } from '../models/Quiz.js'
import { Course } from '../models/Course.js'
import { AppError } from '../utils/AppError.js'
import {
  calculateQuizTotalMarks,
  ensureAssessmentNotLockedForInstructor,
  ensureAssignedInstructorForCourse,
  ensureCourseExists,
  ensureLessonBelongsToCourse,
  validateQuizQuestions,
  validateQuizSettings
} from './assessmentReviewService.js'

const normalizeQuizPayload = (payload = {}) => {
  const settings = validateQuizSettings(payload)
  const questions = validateQuizQuestions(Array.isArray(payload.questions) ? payload.questions : [])
  return { settings, questions }
}

export const listCourseQuizzes = async ({ courseId, instructorId, filters = {} } = {}) => {
  const course = await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const query = { courseId: new mongoose.Types.ObjectId(courseId) }
  if (filters.type && filters.type !== 'all') query.type = filters.type
  if (filters.reviewStatus && filters.reviewStatus !== 'all') query.reviewStatus = filters.reviewStatus
  if (filters.publicationStatus && filters.publicationStatus !== 'all') query.publicationStatus = filters.publicationStatus
  if (filters.search) {
    const escaped = String(filters.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
      { instructions: { $regex: escaped, $options: 'i' } }
    ]
  }

  const quizzes = await Quiz.find(query).sort({ updatedAt: -1 }).lean()
  return quizzes.map(serializeQuiz)
}

export const createQuiz = async ({ courseId, instructorId, payload = {} }) => {
  await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const targetCourse = await ensureCourseExists(courseId)
  if (targetCourse.status === 'archived') throw new AppError('Archived courses cannot accept new assessments.', 409)

  const settings = validateQuizSettings(payload)
  await ensureLessonBelongsToCourse({ courseId, lessonId: settings.lessonId })

  const draft = await Quiz.create({
    courseId: new mongoose.Types.ObjectId(courseId),
    lessonId: settings.lessonId ? new mongoose.Types.ObjectId(String(settings.lessonId)) : null,
    title: settings.title,
    description: settings.description,
    instructions: settings.instructions,
    passingPercentage: settings.passingPercentage,
    timeLimitMinutes: settings.timeLimitMinutes,
    maximumAttempts: settings.maximumAttempts,
    shuffleQuestions: settings.shuffleQuestions,
    questions: [],
    totalMarks: 0,
    createdBy: new mongoose.Types.ObjectId(instructorId),
    updatedBy: new mongoose.Types.ObjectId(instructorId),
    reviewStatus: 'not_submitted',
    publicationStatus: 'draft'
  })

  return serializeQuiz(draft)
}

export const getQuizByIdForInstructor = async ({ courseId, instructorId, quizId }) => {
  await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const quiz = await Quiz.findOne({ _id: quizId, courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  return serializeQuiz(quiz)
}

export const updateQuiz = async ({ courseId, instructorId, quizId, payload = {} }) => {
  const course = await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const quiz = await Quiz.findOne({ _id: quizId, courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  ensureAssessmentNotLockedForInstructor({ assessment: quiz })

  const fields = { title: 'title', description: 'description', instructions: 'instructions', passingPercentage: 'passingPercentage', timeLimitMinutes: 'timeLimitMinutes', maximumAttempts: 'maximumAttempts', shuffleQuestions: 'shuffleQuestions', lessonId: 'lessonId' }
  const updates = {}

  for (const [key, field] of Object.entries(fields)) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      if (key === 'lessonId') {
        if (payload.lessonId === null || payload.lessonId === '') {
          updates[field] = null
        } else if (mongoose.isValidObjectId(payload.lessonId)) {
          updates[field] = new mongoose.Types.ObjectId(String(payload.lessonId))
        } else {
          throw new AppError('Invalid lesson reference.', 400)
        }
      } else {
        updates[field] = payload[key]
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    if (updates.lessonId !== undefined) await ensureLessonBelongsToCourse({ courseId, lessonId: updates.lessonId })
    const sanitized = { ...updates }
    if (Object.prototype.hasOwnProperty.call(sanitized, 'title')) sanitized.title = String(sanitized.title).trim()
    if (Object.prototype.hasOwnProperty.call(sanitized, 'description')) sanitized.description = String(sanitized.description || '').trim()
    if (Object.prototype.hasOwnProperty.call(sanitized, 'instructions')) sanitized.instructions = String(sanitized.instructions || '').trim()
    if (Object.prototype.hasOwnProperty.call(sanitized, 'timeLimitMinutes')) sanitized.timeLimitMinutes = sanitized.timeLimitMinutes === null || sanitized.timeLimitMinutes === undefined || sanitized.timeLimitMinutes === '' ? null : Number(sanitized.timeLimitMinutes)
    if (Object.prototype.hasOwnProperty.call(sanitized, 'passingPercentage')) sanitized.passingPercentage = Number(sanitized.passingPercentage)
    if (Object.prototype.hasOwnProperty.call(sanitized, 'maximumAttempts')) sanitized.maximumAttempts = Number(sanitized.maximumAttempts)
    if (Object.prototype.hasOwnProperty.call(sanitized, 'shuffleQuestions')) sanitized.shuffleQuestions = Boolean(sanitized.shuffleQuestions)

    validateQuizSettings({ ...quiz, ...sanitized })
    await Quiz.findByIdAndUpdate(quiz._id, { $set: { ...sanitized, updatedBy: new mongoose.Types.ObjectId(instructorId) } }, { new: true, runValidators: true })
  }

  const refreshed = await Quiz.findById(quiz._id).lean()
  return serializeQuiz(refreshed)
}

export const createQuestion = async ({ courseId, instructorId, quizId, payload = {} }) => {
  await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const quiz = await Quiz.findOne({ _id: quizId, courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  ensureAssessmentNotLockedForInstructor({ assessment: quiz })

  const question = validateQuizQuestions([payload])[0]
  const nextQuestions = Array.isArray(quiz.questions) ? [...quiz.questions] : []
  nextQuestions.push({ ...question, _id: question._id })
  if (nextQuestions.some((entry) => String(entry._id) === String(question._id))) {
    // no-op
  }
  const totalMarks = calculateQuizTotalMarks(nextQuestions)
  const updated = await Quiz.findByIdAndUpdate(quiz._id, { $set: { questions: nextQuestions, totalMarks, updatedBy: new mongoose.Types.ObjectId(instructorId) } }, { new: true, runValidators: true }).lean()
  return serializeQuiz(updated)
}

export const updateQuestion = async ({ courseId, instructorId, quizId, questionId, payload = {} }) => {
  await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const quiz = await Quiz.findOne({ _id: quizId, courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  ensureAssessmentNotLockedForInstructor({ assessment: quiz })

  const currentQuestion = (quiz.questions || []).find((entry) => String(entry._id) === String(questionId))
  if (!currentQuestion) throw new AppError('Question not found.', 404)

  const mergedQuestion = { ...currentQuestion, ...payload, _id: currentQuestion._id }
  const nextQuestion = validateQuizQuestions([mergedQuestion])[0]
  const nextQuestions = (quiz.questions || []).map((entry) => String(entry._id) === String(questionId) ? nextQuestion : entry)
  const totalMarks = calculateQuizTotalMarks(nextQuestions)
  const updated = await Quiz.findByIdAndUpdate(quiz._id, { $set: { questions: nextQuestions, totalMarks, updatedBy: new mongoose.Types.ObjectId(instructorId) } }, { new: true, runValidators: true }).lean()
  return serializeQuiz(updated)
}

export const reorderQuestions = async ({ courseId, instructorId, quizId, orderedQuestionIds = [] }) => {
  await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const quiz = await Quiz.findOne({ _id: quizId, courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  ensureAssessmentNotLockedForInstructor({ assessment: quiz })

  const currentIds = (quiz.questions || []).map((entry) => String(entry._id))
  const requestedIds = orderedQuestionIds.map(String)
  if (requestedIds.length !== currentIds.length) throw new AppError('Question ordering is invalid.', 422)
  if (new Set(requestedIds).size !== requestedIds.length) throw new AppError('Duplicate question IDs are not allowed.', 422)
  const missing = currentIds.filter((id) => !requestedIds.includes(id))
  if (missing.length) throw new AppError('Question ordering is incomplete.', 422)

  const ordered = requestedIds.map((questionId) => {
    const match = (quiz.questions || []).find((entry) => String(entry._id) === questionId)
    if (!match) throw new AppError('Unknown question ID detected.', 422)
    return { ...match, order: 0 }
  })

  const sorted = ordered.map((question, index) => ({ ...question, order: index }))
  const updated = await Quiz.findByIdAndUpdate(quiz._id, { $set: { questions: sorted, updatedBy: new mongoose.Types.ObjectId(instructorId) } }, { new: true, runValidators: true }).lean()
  return serializeQuiz(updated)
}

export const archiveQuestion = async ({ courseId, instructorId, quizId, questionId }) => {
  await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const quiz = await Quiz.findOne({ _id: quizId, courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  ensureAssessmentNotLockedForInstructor({ assessment: quiz })

  const nextQuestions = (quiz.questions || []).filter((entry) => String(entry._id) !== String(questionId))
  if (nextQuestions.length === quiz.questions.length) throw new AppError('Question not found.', 404)
  const updated = await Quiz.findByIdAndUpdate(quiz._id, { $set: { questions: nextQuestions.map((entry, index) => ({ ...entry, order: index })), totalMarks: calculateQuizTotalMarks(nextQuestions.map((entry, index) => ({ ...entry, order: index }))), updatedBy: new mongoose.Types.ObjectId(instructorId) } }, { new: true, runValidators: true }).lean()
  return serializeQuiz(updated)
}

export const submitQuizForReview = async ({ courseId, instructorId, quizId }) => {
  await ensureAssignedInstructorForCourse({ courseId, instructorId })
  const quiz = await Quiz.findOne({ _id: quizId, courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  if (quiz.publicationStatus === 'published') throw new AppError('Published quizzes cannot be edited or resubmitted.', 409)
  if (quiz.reviewStatus === 'pending') throw new AppError('This quiz is already pending review.', 409)

  const settings = validateQuizSettings(quiz)
  const normalizedQuestions = validateQuizQuestions(quiz.questions || [])
  const totalMarks = calculateQuizTotalMarks(normalizedQuestions)

  const updated = await Quiz.findByIdAndUpdate(quiz._id, {
    $set: {
      title: settings.title,
      description: settings.description,
      instructions: settings.instructions,
      passingPercentage: settings.passingPercentage,
      timeLimitMinutes: settings.timeLimitMinutes,
      maximumAttempts: settings.maximumAttempts,
      shuffleQuestions: settings.shuffleQuestions,
      lessonId: settings.lessonId,
      questions: normalizedQuestions,
      totalMarks,
      reviewStatus: 'pending',
      publicationStatus: 'draft',
      submittedForReviewAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      reviewFeedback: null,
      updatedBy: new mongoose.Types.ObjectId(instructorId)
    }
  }, { new: true, runValidators: true }).lean()

  return serializeQuiz(updated)
}

export const archiveQuiz = async ({ courseId, instructorId, quizId }) => {
  const quiz = await Quiz.findOne({ _id: quizId, courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  if (String(quiz.createdBy || '') !== String(instructorId)) throw new AppError('You are not assigned to this course.', 403)
  if (quiz.publicationStatus === 'published') throw new AppError('Published quizzes cannot be archived by instructors.', 409)
  if (quiz.reviewStatus === 'pending') throw new AppError('Pending quizzes cannot be archived by instructors.', 409)

  const updated = await Quiz.findByIdAndUpdate(quiz._id, {
    $set: {
      publicationStatus: 'archived',
      archivedAt: new Date(),
      updatedBy: new mongoose.Types.ObjectId(instructorId)
    }
  }, { new: true, runValidators: true }).lean()

  return serializeQuiz(updated)
}

export const getQuizForAdminReview = async ({ quizId }) => {
  const quiz = await Quiz.findById(quizId).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  return serializeQuiz(quiz)
}

export const approveQuiz = async ({ quizId, adminId }) => {
  const quiz = await Quiz.findById(quizId).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  if (quiz.reviewStatus !== 'pending') throw new AppError('Only pending assessments can be approved.', 409)
  const updated = await Quiz.findByIdAndUpdate(quizId, {
    $set: {
      reviewStatus: 'approved',
      reviewedAt: new Date(),
      reviewedBy: new mongoose.Types.ObjectId(adminId),
      reviewFeedback: null,
      updatedBy: new mongoose.Types.ObjectId(adminId)
    }
  }, { new: true, runValidators: true }).lean()
  return serializeQuiz(updated)
}

export const requestQuizChanges = async ({ quizId, adminId, feedback }) => {
  const quiz = await Quiz.findById(quizId).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  const clean = typeof feedback === 'string' ? feedback.trim() : ''
  if (!clean) throw new AppError('Feedback is required when requesting changes.', 422)
  const updated = await Quiz.findByIdAndUpdate(quizId, {
    $set: {
      reviewStatus: 'changes_requested',
      reviewedAt: new Date(),
      reviewedBy: new mongoose.Types.ObjectId(adminId),
      reviewFeedback: clean,
      updatedBy: new mongoose.Types.ObjectId(adminId)
    }
  }, { new: true, runValidators: true }).lean()
  return serializeQuiz(updated)
}

export const publishQuiz = async ({ quizId, adminId }) => {
  const quiz = await Quiz.findById(quizId).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  const course = await Course.findById(quiz.courseId).lean()
  if (!course) throw new AppError('Parent course not found.', 404)
  if (course.status !== 'published') throw new AppError('Parent course must be published before this assessment can be published.', 409)
  if (quiz.publicationStatus === 'archived') throw new AppError('Archived assessments cannot be published.', 409)
  if (quiz.reviewStatus !== 'approved') throw new AppError('Only approved assessments can be published.', 409)
  const questions = validateQuizQuestions(quiz.questions || [])
  const totalMarks = calculateQuizTotalMarks(questions)
  const updated = await Quiz.findByIdAndUpdate(quizId, {
    $set: {
      questions,
      totalMarks,
      publicationStatus: 'published',
      publishedAt: new Date(),
      publishedBy: new mongoose.Types.ObjectId(adminId),
      updatedBy: new mongoose.Types.ObjectId(adminId)
    }
  }, { new: true, runValidators: true }).lean()
  return serializeQuiz(updated)
}

export const unpublishQuiz = async ({ quizId, adminId }) => {
  const quiz = await Quiz.findById(quizId).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  if (quiz.publicationStatus !== 'published') throw new AppError('Only published assessments can be unpublished.', 409)
  const updated = await Quiz.findByIdAndUpdate(quizId, {
    $set: {
      publicationStatus: 'draft',
      publishedAt: null,
      publishedBy: null,
      updatedBy: new mongoose.Types.ObjectId(adminId)
    }
  }, { new: true, runValidators: true }).lean()
  return serializeQuiz(updated)
}

export const archiveQuizAsAdmin = async ({ quizId, adminId }) => {
  const quiz = await Quiz.findById(quizId).lean()
  if (!quiz) throw new AppError('Quiz not found.', 404)
  const updated = await Quiz.findByIdAndUpdate(quizId, {
    $set: {
      publicationStatus: 'archived',
      archivedAt: new Date(),
      updatedBy: new mongoose.Types.ObjectId(adminId)
    }
  }, { new: true, runValidators: true }).lean()
  return serializeQuiz(updated)
}

export const listAdminQuizzes = async ({ search = '', reviewStatus = 'all', publicationStatus = 'all', courseId = null } = {}) => {
  const query = {}
  if (reviewStatus && reviewStatus !== 'all') query.reviewStatus = reviewStatus
  if (publicationStatus && publicationStatus !== 'all') query.publicationStatus = publicationStatus
  if (courseId && mongoose.isValidObjectId(courseId)) query.courseId = new mongoose.Types.ObjectId(courseId)
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [{ title: { $regex: escaped, $options: 'i' } }, { description: { $regex: escaped, $options: 'i' } }]
  }

  const quizzes = await Quiz.find(query).sort({ updatedAt: -1 }).lean()
  return quizzes.map((item) => serializeQuizPublic(item))
}

export default { listCourseQuizzes, createQuiz, getQuizByIdForInstructor, updateQuiz, createQuestion, updateQuestion, reorderQuestions, archiveQuestion, submitQuizForReview, archiveQuiz, getQuizForAdminReview, approveQuiz, requestQuizChanges, publishQuiz, unpublishQuiz, archiveQuizAsAdmin, listAdminQuizzes }
