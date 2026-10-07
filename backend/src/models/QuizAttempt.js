import mongoose from 'mongoose'

const optionSnapshotSchema = new mongoose.Schema({
  optionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  text: { type: String, required: true, trim: true }
}, { _id: false })

const questionSnapshotSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, required: true },
  prompt: { type: String, required: true, trim: true },
  options: { type: [optionSnapshotSchema], default: [] },
  correctOptionId: { type: mongoose.Schema.Types.ObjectId, default: null },
  correctAnswer: { type: String, default: null },
  explanation: { type: String, default: null },
  marks: { type: Number, default: 0, min: 0 },
  order: { type: Number, default: 0, min: 0 }
}, { _id: false })

const answerEntrySchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selectedOptionId: { type: mongoose.Schema.Types.ObjectId, default: null },
  textAnswer: { type: String, default: null, trim: true },
  savedAt: { type: Date, default: Date.now }
}, { _id: false })

const quizAttemptSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true, index: true },
  attemptNumber: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['in_progress', 'submitted', 'expired'], default: 'in_progress', index: true },
  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  submittedAt: { type: Date, default: null },
  questionSnapshot: { type: [questionSnapshotSchema], default: [] },
  answers: { type: [answerEntrySchema], default: [] },
  earnedMarks: { type: Number, default: null },
  totalMarks: { type: Number, default: 0 },
  percentage: { type: Number, default: null },
  passed: { type: Boolean, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false })

quizAttemptSchema.index({ studentId: 1, quizId: 1, attemptNumber: 1 }, { unique: true })
quizAttemptSchema.index({ studentId: 1, createdAt: -1 })
quizAttemptSchema.index({ studentId: 1, status: 1, submittedAt: -1 })
quizAttemptSchema.index({ studentId: 1, quizId: 1, status: 1 })
quizAttemptSchema.index({ quizId: 1, studentId: 1, status: 1 })

export const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', quizAttemptSchema)
export default QuizAttempt
