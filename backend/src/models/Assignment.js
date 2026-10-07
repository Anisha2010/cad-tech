import mongoose from 'mongoose'

const resourceSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true }
}, { _id: false })

const assignmentSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseCurriculum', default: null },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  instructions: { type: String, required: true, trim: true },
  maximumMarks: { type: Number, required: true, min: 1 },
  dueDate: { type: Date, default: null },
  required: { type: Boolean, default: true },
  allowLateSubmissions: { type: Boolean, default: true },
  allowedSubmissionTypes: { type: [String], default: ['pdf'], enum: ['pdf', 'document', 'image', 'text'] },
  resources: { type: [resourceSchema], default: [] },
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

assignmentSchema.index({ courseId: 1, title: 'text' })

export const serializeAssignment = (value) => {
  const doc = typeof value?.toObject === 'function' ? value.toObject() : (value || {})
  return {
    id: String(doc._id || doc.id),
    courseId: doc.courseId ? String(doc.courseId) : null,
    lessonId: doc.lessonId ? String(doc.lessonId) : null,
    title: doc.title || '',
    description: doc.description || '',
    instructions: doc.instructions || '',
    maximumMarks: Number(doc.maximumMarks ?? 0),
    dueDate: doc.dueDate ? new Date(doc.dueDate).toISOString() : null,
    allowLateSubmissions: Boolean(doc.allowLateSubmissions !== false),
    allowedSubmissionTypes: Array.isArray(doc.allowedSubmissionTypes) ? doc.allowedSubmissionTypes : [],
    resources: Array.isArray(doc.resources) ? doc.resources.map((resource) => ({
      id: String(resource._id || resource.id),
      title: resource.title || '',
      url: resource.url || ''
    })) : [],
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

export const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema)
export default Assignment
