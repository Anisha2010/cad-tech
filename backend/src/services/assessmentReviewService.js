import mongoose from 'mongoose'
import { Course } from '../models/Course.js'
import { CourseCurriculum } from '../models/CourseCurriculum.js'
import { AppError } from '../utils/AppError.js'

const SAFE_TEXT_REGEX = /<\/?[a-z][\s\S]*>/gi

export const normalizeText = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback
  return value.trim()
}

export const sanitizeReviewFeedback = (value) => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return null
  const cleaned = text.replace(SAFE_TEXT_REGEX, '').replace(/\s+/g, ' ').trim()
  return cleaned.length > 2000 ? cleaned.slice(0, 2000) : cleaned
}

export const ensureCourseExists = async (courseId) => {
  if (!mongoose.isValidObjectId(courseId)) throw new AppError('Course not found.', 404)
  const course = await Course.findById(courseId).lean()
  if (!course) throw new AppError('Course not found.', 404)
  return course
}

export const ensureAssignedInstructorForCourse = async ({ courseId, instructorId }) => {
  const course = await ensureCourseExists(courseId)
  if (String(course.instructorId || '') !== String(instructorId)) {
    throw new AppError('You are not assigned to this course.', 403)
  }
  return course
}

export const ensureLessonBelongsToCourse = async ({ courseId, lessonId }) => {
  if (!lessonId) return true
  if (!mongoose.isValidObjectId(lessonId)) throw new AppError('Invalid lesson reference.', 400)
  const curriculum = await CourseCurriculum.findOne({ courseId: new mongoose.Types.ObjectId(courseId) }).lean()
  if (!curriculum) throw new AppError('Course curriculum not found.', 404)
  const matches = Array.isArray(curriculum.sections)
    ? curriculum.sections.some((section) => Array.isArray(section.lessons) && section.lessons.some((lesson) => String(lesson.id || lesson._id) === String(lessonId) && (!lesson.archivedAt)))
    : false
  if (!matches) throw new AppError('Selected lesson does not belong to this course.', 400)
  return true
}

export const ensureAssessmentNotLockedForInstructor = ({ assessment }) => {
  if (!assessment) return
  if (assessment.publicationStatus === 'published') {
    throw new AppError('Published assessments cannot be edited by instructors.', 409)
  }
  if (assessment.reviewStatus === 'pending') {
    throw new AppError('This assessment is under admin review and is read-only.', 409)
  }
  if (assessment.reviewStatus === 'approved') {
    throw new AppError('Approved assessments are locked for instructor edits until changes are requested.', 409)
  }
}

export const ensureAssessmentIsDraftOrChangesRequested = ({ assessment }) => {
  if (!assessment) return
  if (assessment.publicationStatus === 'archived' || assessment.publicationStatus === 'published') {
    throw new AppError('Only draft or changes-requested assessments can be archived by instructors.', 409)
  }
  if (!['draft', 'changes_requested'].includes(assessment.publicationStatus) && assessment.reviewStatus !== 'changes_requested') {
    throw new AppError('Only draft or changes-requested assessments can be archived by instructors.', 409)
  }
}

export const validateQuestionType = (value) => ['multiple_choice', 'true_false'].includes(value) ? value : null

export const validateIsObjectId = (value) => {
  if (!value) return false
  if (value instanceof mongoose.Types.ObjectId) return true
  return mongoose.isValidObjectId(value)
}

export const normalizeQuizQuestion = (question, index) => {
  const type = validateQuestionType(question?.type)
  if (!type) throw new AppError(`Question ${index + 1} has an unsupported type.`, 422)

  const prompt = normalizeText(question?.prompt)
  if (!prompt) throw new AppError(`Question ${index + 1} requires a prompt.`, 422)

  const marks = Number(question?.marks)
  if (!Number.isInteger(marks) || marks <= 0) throw new AppError(`Question ${index + 1} must use positive integer marks.`, 422)

  const order = Number(question?.order)
  if (!Number.isInteger(order) || order < 0) throw new AppError(`Question ${index + 1} has an invalid order.`, 422)

  if (type === 'multiple_choice') {
    const options = Array.isArray(question?.options) ? question.options : []
    if (options.length < 2) throw new AppError(`Question ${index + 1} must contain at least two options.`, 422)

    const normalizedOptions = options.map((option, optionIndex) => {
      const text = normalizeText(option?.text)
      if (!text) throw new AppError(`Question ${index + 1} has an empty option at position ${optionIndex + 1}.`, 422)
      const id = option?._id || option?.id || new mongoose.Types.ObjectId()
      return { _id: new mongoose.Types.ObjectId(String(id)), text }
    })

    const uniqueIds = normalizedOptions.map((option) => String(option._id))
    if (new Set(uniqueIds).size !== uniqueIds.length) throw new AppError(`Question ${index + 1} contains duplicate option IDs.`, 422)

    const chosenId = question?.correctOptionId
    if (!validateIsObjectId(chosenId)) throw new AppError(`Question ${index + 1} must include a valid correct option.`, 422)
    const correctId = String(new mongoose.Types.ObjectId(String(chosenId)))
    const belongs = normalizedOptions.some((option) => String(option._id) === correctId)
    if (!belongs) throw new AppError(`Question ${index + 1} has a correct answer that does not belong to the question.`, 422)

    const correctCount = normalizedOptions.filter((option) => String(option._id) === correctId).length
    if (correctCount !== 1) throw new AppError(`Question ${index + 1} must have exactly one correct answer.`, 422)

    return {
      _id: question?._id && validateIsObjectId(question._id) ? new mongoose.Types.ObjectId(String(question._id)) : new mongoose.Types.ObjectId(),
      type,
      prompt,
      options: normalizedOptions,
      correctOptionId: new mongoose.Types.ObjectId(correctId),
      explanation: typeof question?.explanation === 'string' ? question.explanation.trim() || null : null,
      marks,
      order
    }
  }

  const options = [
    { _id: new mongoose.Types.ObjectId(), text: 'True' },
    { _id: new mongoose.Types.ObjectId(), text: 'False' }
  ]
  const correctValue = question?.correctOptionId
  if (!validateIsObjectId(correctValue)) throw new AppError(`Question ${index + 1} must include a valid correct answer.`, 422)
  const correctOptionId = new mongoose.Types.ObjectId(String(correctValue))
  return {
    _id: question?._id && validateIsObjectId(question._id) ? new mongoose.Types.ObjectId(String(question._id)) : new mongoose.Types.ObjectId(),
    type,
    prompt,
    options,
    correctOptionId,
    explanation: typeof question?.explanation === 'string' ? question.explanation.trim() || null : null,
    marks,
    order
  }
}

export const validateQuizSettings = (payload = {}) => {
  const title = normalizeText(payload.title)
  if (!title) throw new AppError('Quiz title is required.', 422)

  const passingPercentage = Number(payload.passingPercentage)
  if (!Number.isFinite(passingPercentage) || passingPercentage < 0 || passingPercentage > 100) {
    throw new AppError('Passing percentage must be between 0 and 100.', 422)
  }

  const timeLimitMinutes = payload.timeLimitMinutes === null || payload.timeLimitMinutes === undefined ? null : Number(payload.timeLimitMinutes)
  if (timeLimitMinutes !== null && (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes <= 0)) {
    throw new AppError('Time limit minutes must be null or a positive integer.', 422)
  }

  const maximumAttempts = Number(payload.maximumAttempts)
  if (!Number.isInteger(maximumAttempts) || maximumAttempts <= 0) {
    throw new AppError('Maximum attempts must be a positive integer.', 422)
  }

  if (typeof payload.shuffleQuestions !== 'boolean') {
    throw new AppError('Shuffle questions must be a boolean value.', 422)
  }

  return {
    title,
    description: normalizeText(payload.description, ''),
    instructions: normalizeText(payload.instructions, ''),
    passingPercentage,
    timeLimitMinutes,
    maximumAttempts,
    shuffleQuestions: payload.shuffleQuestions,
    lessonId: payload.lessonId && mongoose.isValidObjectId(payload.lessonId) ? new mongoose.Types.ObjectId(String(payload.lessonId)) : null
  }
}

export const calculateQuizTotalMarks = (questions = []) => questions.reduce((total, question) => total + (Number(question.marks) || 0), 0)

export const validateQuizQuestions = (questions = []) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new AppError('Quiz must contain at least one valid question before review submission.', 422)
  }

  const normalized = questions.map((question, index) => normalizeQuizQuestion(question, index))
  const totalMarks = calculateQuizTotalMarks(normalized)
  if (!totalMarks || totalMarks <= 0) throw new AppError('Quiz total marks must be greater than zero.', 422)
  return normalized
}

export const validateAssignmentPayload = (payload = {}) => {
  const title = normalizeText(payload.title)
  if (!title) throw new AppError('Assignment title is required.', 422)

  const instructions = normalizeText(payload.instructions)
  if (!instructions) throw new AppError('Assignment instructions are required.', 422)

  const maximumMarks = Number(payload.maximumMarks)
  if (!Number.isInteger(maximumMarks) || maximumMarks <= 0) {
    throw new AppError('Maximum marks must be a positive integer.', 422)
  }

  const dueDateValue = payload.dueDate === null || payload.dueDate === undefined || payload.dueDate === '' ? null : new Date(payload.dueDate)
  if (dueDateValue && Number.isNaN(dueDateValue.getTime())) throw new AppError('Due date is invalid.', 422)

  const allowLateSubmissions = typeof payload.allowLateSubmissions === 'boolean' ? payload.allowLateSubmissions : true

  const allowedTypes = Array.isArray(payload.allowedSubmissionTypes) ? payload.allowedSubmissionTypes : []
  const normalizedTypes = allowedTypes.filter((value) => typeof value === 'string').map((value) => value.trim().toLowerCase())
  const invalidType = normalizedTypes.find((value) => !['pdf', 'document', 'image', 'text'].includes(value))
  if (invalidType) throw new AppError(`Unsupported submission type: ${invalidType}`, 422)
  if (normalizedTypes.length === 0) throw new AppError('At least one allowed submission type is required.', 422)

  const resources = Array.isArray(payload.resources) ? payload.resources : []
  const normalizedResources = resources.map((entry) => {
    const resourceTitle = normalizeText(entry?.title, '')
    const url = typeof entry?.url === 'string' ? entry.url.trim() : ''
    if (!resourceTitle || !url) throw new AppError('Each assignment resource must include a title and URL.', 422)
    if (!/^https?:\/\//i.test(url)) throw new AppError('Assignment resource URLs must use http or https.', 422)
    return { _id: entry?._id && validateIsObjectId(entry._id) ? new mongoose.Types.ObjectId(String(entry._id)) : new mongoose.Types.ObjectId(), title: resourceTitle, url }
  })

  return {
    title,
    description: normalizeText(payload.description, ''),
    instructions,
    maximumMarks,
    dueDate: dueDateValue,
    allowLateSubmissions,
    allowedSubmissionTypes: Array.from(new Set(normalizedTypes)),
    resources: normalizedResources,
    lessonId: payload.lessonId && mongoose.isValidObjectId(payload.lessonId) ? new mongoose.Types.ObjectId(String(payload.lessonId)) : null
  }
}

export const setReviewStatus = async ({ assessment, reviewStatus, adminId, feedback = null }) => {
  const nextFeedback = reviewStatus === 'changes_requested' ? sanitizeReviewFeedback(feedback) : null
  if (reviewStatus === 'changes_requested' && !nextFeedback) {
    throw new AppError('Feedback is required when requesting changes.', 422)
  }

  const update = {
    reviewStatus,
    reviewedAt: new Date(),
    reviewedBy: adminId,
    reviewFeedback: reviewStatus === 'approved' ? null : nextFeedback,
    updatedBy: adminId
  }

  if (reviewStatus === 'approved') {
    update.reviewFeedback = null
  }

  return update
}

export const buildAssessmentQueryFilters = ({ type, reviewStatus, publicationStatus, search, courseId }) => {
  const query = {}
  if (type === 'quiz' || type === 'assignment') query.type = type
  if (reviewStatus && reviewStatus !== 'all') query.reviewStatus = reviewStatus
  if (publicationStatus && publicationStatus !== 'all') query.publicationStatus = publicationStatus
  if (courseId && mongoose.isValidObjectId(courseId)) query.courseId = new mongoose.Types.ObjectId(courseId)
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
      { instructions: { $regex: escaped, $options: 'i' } }
    ]
  }
  return query
}

export const ensureCoursePublishedForPublishing = async ({ courseId }) => {
  const course = await ensureCourseExists(courseId)
  if (course.status !== 'published') throw new AppError('Parent course must be published before this assessment can be published.', 409)
  return course
}

export const ensureAssessmentReviewReadyForPublish = ({ assessment }) => {
  if (!assessment) throw new AppError('Assessment not found.', 404)
  if (assessment.publicationStatus === 'archived') throw new AppError('Archived assessments cannot be published.', 409)
  if (assessment.reviewStatus !== 'approved') throw new AppError('Only approved assessments can be published.', 409)
}
