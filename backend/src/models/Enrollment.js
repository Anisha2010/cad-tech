import mongoose from 'mongoose'

const lessonProgressSchema = new mongoose.Schema({
  lessonId: { type: String, required: true, trim: true },
  title: { type: String, default: '', trim: true },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
  lastPositionSeconds: { type: Number, min: 0, default: 0 },
  completedAt: { type: Date, default: null },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false })

const enrollmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  progressPercentage: { type: Number, min: 0, max: 100, default: 0 },
  lessonProgress: { type: [lessonProgressSchema], default: [] },
  enrolledAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false })

enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true })
enrollmentSchema.index({ userId: 1, enrolledAt: -1 })

export const serializeEnrollment = (enrollment) => {
  const value = typeof enrollment.toObject === 'function' ? enrollment.toObject() : enrollment
  const course = value.courseId && typeof value.courseId === 'object' ? value.courseId : null
  return {
    id: String(value._id || value.id),
    courseSlug: course?.slug,
    courseTitle: course?.title,
    shortDescription: course?.shortDescription,
    software: course?.software,
    category: course?.category,
    level: course?.level,
    duration: course?.duration,
    lessonCount: course?.lessonCount ?? null,
    thumbnailUrl: course?.thumbnailUrl ?? null,
    status: value.status,
    progressPercentage: value.progressPercentage,
    lessonProgress: Array.isArray(value.lessonProgress) ? value.lessonProgress.map((lesson) => ({
      lessonId: lesson.lessonId,
      title: lesson.title,
      status: lesson.status,
      lastPositionSeconds: Number(lesson.lastPositionSeconds || 0),
      completedAt: lesson.completedAt ? new Date(lesson.completedAt).toISOString() : null,
      updatedAt: lesson.updatedAt ? new Date(lesson.updatedAt).toISOString() : null
    })) : [],
    enrolledAt: value.enrolledAt?.toISOString?.() || value.enrolledAt,
    lastAccessedAt: value.lastAccessedAt?.toISOString?.() || value.lastAccessedAt
  }
}

export const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema)
export default Enrollment