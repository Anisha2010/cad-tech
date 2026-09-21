import mongoose from 'mongoose'

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  shortDescription: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true, index: true },
  software: { type: String, required: true, trim: true, index: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true, index: true },
  duration: { type: String, default: null },
  lessonCount: { type: Number, default: null, min: 0 },
  thumbnailUrl: { type: String, default: null },
  learningOutcomes: { type: [String], default: [] },
  requirements: { type: [String], default: [] },
  priceInPaise: { type: Number, default: null, validate: { validator: (value) => value === null || (Number.isInteger(value) && value > 0), message: 'Enter a valid course price.' } },
  currency: { type: String, enum: ['INR'], default: 'INR' },
  enrollmentOpen: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  reviewStatus: { type: String, enum: ['not_submitted', 'pending', 'changes_requested', 'approved'], default: 'not_submitted', index: true },
  submittedForReviewAt: { type: Date, default: null },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewFeedback: { type: String, default: null },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true }
}, { timestamps: true, versionKey: false })

courseSchema.index({ title: 'text', slug: 'text', software: 'text' })

export const serializeCourse = (course) => {
  const value = typeof course.toObject === 'function' ? course.toObject() : course
  return {
    id: String(value._id || value.id),
    title: value.title,
    slug: value.slug,
    shortDescription: value.shortDescription,
    description: value.description,
    category: value.category,
    software: value.software,
    level: value.level,
    duration: value.duration,
    lessonCount: value.lessonCount ?? 0,
    thumbnailUrl: value.thumbnailUrl ?? null,
    learningOutcomes: Array.isArray(value.learningOutcomes) ? value.learningOutcomes.filter(Boolean) : [],
    requirements: Array.isArray(value.requirements) ? value.requirements.filter(Boolean) : [],
    priceInPaise: value.priceInPaise ?? null,
    currency: value.currency || 'INR',
    enrollmentOpen: Boolean(value.enrollmentOpen),
    status: value.status,
    instructorId: value.instructorId ? String(value.instructorId) : null,
    reviewStatus: value.reviewStatus || 'not_submitted',
    submittedForReviewAt: value.submittedForReviewAt ? new Date(value.submittedForReviewAt).toISOString() : null,
    reviewedAt: value.reviewedAt ? new Date(value.reviewedAt).toISOString() : null,
    reviewedBy: value.reviewedBy ? String(value.reviewedBy) : null,
    reviewFeedback: value.reviewFeedback ?? null,
    createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : null,
    updatedAt: value.updatedAt ? new Date(value.updatedAt).toISOString() : null
  }
}

export const Course = mongoose.models.Course || mongoose.model('Course', courseSchema)
export default Course