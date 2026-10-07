import mongoose from 'mongoose'

const optionSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  text: { type: String, required: true, trim: true }
}, { _id: false })

const questionSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  type: { type: String, enum: ['multiple_choice', 'true_false', 'short_answer'], required: true },
  prompt: { type: String, required: true, trim: true },
  options: { type: [optionSchema], default: [] },
  correctOptionId: { type: mongoose.Schema.Types.ObjectId, default: null },
  correctAnswer: { type: String, default: null, trim: true },
  explanation: { type: String, default: null, trim: true },
  marks: { type: Number, required: true, min: 1 },
  order: { type: Number, required: true, min: 0 }
}, { _id: false })

const quizSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseCurriculum', default: null },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  instructions: { type: String, default: '', trim: true },
  passingPercentage: { type: Number, default: 70, min: 0, max: 100 },
  timeLimitMinutes: { type: Number, default: null, min: 1 },
  maximumAttempts: { type: Number, default: 1, min: 1 },
  required: { type: Boolean, default: true },
  shuffleQuestions: { type: Boolean, default: false },
  questions: { type: [questionSchema], default: [] },
  totalMarks: { type: Number, default: 0, min: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewStatus: { type: String, enum: ['not_submitted', 'pending', 'changes_requested', 'approved'], default: 'not_submitted', index: true },
  publicationStatus: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  reviewFeedback: { type: String, default: null },
  submittedForReviewAt: { type: Date, default: null },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  publishedAt: { type: Date, default: null },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  archivedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false })

quizSchema.index({ courseId: 1, title: 'text' })

export const serializeQuiz = (value) => {
  const doc = typeof value?.toObject === 'function' ? value.toObject() : (value || {})
  return {
    id: String(doc._id || doc.id),
    courseId: doc.courseId ? String(doc.courseId) : null,
    lessonId: doc.lessonId ? String(doc.lessonId) : null,
    title: doc.title || '',
    description: doc.description || '',
    instructions: doc.instructions || '',
    passingPercentage: Number(doc.passingPercentage ?? 70),
    timeLimitMinutes: doc.timeLimitMinutes === null || doc.timeLimitMinutes === undefined ? null : Number(doc.timeLimitMinutes),
    maximumAttempts: Number(doc.maximumAttempts ?? 1),
    required: doc.required !== false,
    shuffleQuestions: Boolean(doc.shuffleQuestions),
    questions: Array.isArray(doc.questions) ? doc.questions.map((question) => ({
      id: String(question._id || question.id),
      type: question.type,
      prompt: question.prompt || '',
      options: Array.isArray(question.options) ? question.options.map((option) => ({
        id: String(option._id || option.id),
        text: option.text || ''
      })) : [],
      correctOptionId: question.correctOptionId ? String(question.correctOptionId) : null,
      correctAnswer: question.correctAnswer ?? null,
      explanation: question.explanation ?? null,
      marks: Number(question.marks ?? 0),
      order: Number(question.order ?? 0)
    })) : [],
    totalMarks: Number(doc.totalMarks ?? 0),
    createdBy: doc.createdBy ? String(doc.createdBy) : null,
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : null,
    reviewStatus: doc.reviewStatus || 'not_submitted',
    publicationStatus: doc.publicationStatus || 'draft',
    reviewFeedback: doc.reviewFeedback ?? null,
    submittedForReviewAt: doc.submittedForReviewAt ? new Date(doc.submittedForReviewAt).toISOString() : null,
    reviewedAt: doc.reviewedAt ? new Date(doc.reviewedAt).toISOString() : null,
    reviewedBy: doc.reviewedBy ? String(doc.reviewedBy) : null,
    publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : null,
    publishedBy: doc.publishedBy ? String(doc.publishedBy) : null,
    archivedAt: doc.archivedAt ? new Date(doc.archivedAt).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null
  }
}

export const serializeQuizPublic = (value) => {
  const base = serializeQuiz(value)
  return {
    ...base,
    questions: (base.questions || []).map((question) => ({
      ...question,
      options: (question.options || []).map((option) => ({ ...option, isCorrect: false })),
      correctOptionId: null,
      correctAnswer: null,
      explanation: null
    }))
  }
}

export const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema)
export default Quiz
