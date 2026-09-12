import mongoose from 'mongoose'

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  shortDescription: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  software: { type: String, required: true, trim: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
  duration: { type: String, default: null },
  lessonCount: { type: Number, default: 0, min: 0 },
  thumbnailUrl: { type: String, default: null },
  priceInPaise: { type: Number, default: null, validate: { validator: (value) => value === null || Number.isInteger(value) }, message: 'Course price must be a whole paise value.' },
  currency: { type: String, enum: ['INR'], default: 'INR' },
  enrollmentOpen: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
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
    priceInPaise: value.priceInPaise ?? null,
    currency: value.currency || 'INR',
    enrollmentOpen: Boolean(value.enrollmentOpen),
    status: value.status,
    createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : null,
    updatedAt: value.updatedAt ? new Date(value.updatedAt).toISOString() : null
  }
}

export const Course = mongoose.models.Course || mongoose.model('Course', courseSchema)
export default Course