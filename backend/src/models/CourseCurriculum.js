import mongoose from 'mongoose'

const resourceSchema = new mongoose.Schema({
  title: { type: String, default: '', trim: true },
  url: { type: String, default: '', trim: true }
}, { _id: false })

const lessonSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  type: { type: String, enum: ['video', 'article', 'pdf'], default: 'video' },
  lessonType: { type: String, enum: ['video', 'article', 'pdf', 'quiz'], default: 'video' },
  durationSeconds: { type: Number, min: 0, default: null },
  videoUrl: { type: String, default: null, trim: true },
  captionsUrl: { type: String, default: null, trim: true },
  articleContent: { type: String, default: null, trim: true },
  content: { type: String, default: null, trim: true },
  pdfUrl: { type: String, default: null, trim: true },
  resourceUrl: { type: String, default: null, trim: true },
  resources: { type: [resourceSchema], default: [] },
  order: { type: Number, min: 0, default: 0 },
  isPublished: { type: Boolean, default: true },
  archivedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false })

const sectionSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  order: { type: Number, min: 0, default: 0 },
  isPublished: { type: Boolean, default: true },
  archivedAt: { type: Date, default: null },
  lessons: { type: [lessonSchema], default: [] }
}, { _id: false })

const courseCurriculumSchema = new mongoose.Schema({
  courseSlug: { type: String, required: true, lowercase: true, trim: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  isPublished: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  sections: { type: [sectionSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false })

courseCurriculumSchema.index({ courseId: 1 }, { unique: true })

const normalizeLesson = (lesson = {}) => {
  const type = lesson.type || lesson.lessonType || 'video'
  const rawResourceUrl = lesson.videoUrl || lesson.pdfUrl || lesson.resourceUrl || null
  const articleContent = lesson.articleContent ?? lesson.content ?? ''

  return {
    id: String(lesson.id || lesson._id || ''),
    title: lesson.title || '',
    description: lesson.description || '',
    type,
    lessonType: lesson.lessonType || type,
    durationSeconds: Number.isFinite(Number(lesson.durationSeconds)) ? Number(lesson.durationSeconds) : 0,
    videoUrl: lesson.videoUrl || null,
    captionsUrl: lesson.captionsUrl || null,
    articleContent,
    content: articleContent,
    pdfUrl: lesson.pdfUrl || null,
    resourceUrl: rawResourceUrl,
    resources: Array.isArray(lesson.resources) ? lesson.resources.map((resource) => ({
      title: resource?.title || '',
      url: resource?.url || ''
    })) : [],
    order: Number(lesson.order || 0),
    required: lesson.required !== false,
    isPublished: lesson.isPublished !== false,
    archivedAt: lesson.archivedAt ? new Date(lesson.archivedAt).toISOString() : null
  }
}

export const serializeCourseCurriculum = (curriculum) => {
  const value = typeof curriculum.toObject === 'function' ? curriculum.toObject() : curriculum

  return {
    id: String(value._id || value.id),
    courseSlug: value.courseSlug,
    courseId: value.courseId ? String(value.courseId) : null,
    isPublished: Boolean(value.isPublished),
    status: value.status || (value.isPublished ? 'published' : 'draft'),
    sections: Array.isArray(value.sections) ? value.sections
      .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)))
      .map((section) => ({
        id: String(section.id || section._id || ''),
        title: section.title || '',
        description: section.description || '',
        order: Number(section.order || 0),
        isPublished: section.isPublished !== false,
        archivedAt: section.archivedAt ? new Date(section.archivedAt).toISOString() : null,
        lessons: Array.isArray(section.lessons) ? section.lessons
          .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)))
          .map((lesson) => normalizeLesson(lesson)) : []
      })) : [],
    createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : null,
    updatedAt: value.updatedAt ? new Date(value.updatedAt).toISOString() : null
  }
}

export const CourseCurriculum = mongoose.models.CourseCurriculum || mongoose.model('CourseCurriculum', courseCurriculumSchema)
export default CourseCurriculum
