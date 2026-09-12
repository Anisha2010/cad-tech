import mongoose from 'mongoose'

const lessonSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  lessonType: { type: String, enum: ['video', 'article', 'pdf', 'quiz'], default: 'video' },
  description: { type: String, default: '', trim: true },
  content: { type: String, default: '', trim: true },
  resourceUrl: { type: String, default: null, trim: true },
  durationSeconds: { type: Number, min: 0, default: 0 },
  freePreview: { type: Boolean, default: false },
  order: { type: Number, min: 0, default: 0 },
  isPublished: { type: Boolean, default: true }
}, { _id: false })

const sectionSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  order: { type: Number, min: 0, default: 0 },
  lessons: { type: [lessonSchema], default: [] }
}, { _id: false })

const courseCurriculumSchema = new mongoose.Schema({
  courseSlug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
  sections: { type: [sectionSchema], default: [] },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false })

export const serializeCourseCurriculum = (curriculum) => {
  const value = typeof curriculum.toObject === 'function' ? curriculum.toObject() : curriculum

  return {
    id: String(value._id || value.id),
    courseSlug: value.courseSlug,
    courseId: value.courseId ? String(value.courseId) : null,
    status: value.status,
    sections: Array.isArray(value.sections) ? value.sections
      .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)))
      .map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        order: Number(section.order || 0),
        lessons: Array.isArray(section.lessons) ? section.lessons
          .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)))
          .map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            lessonType: lesson.lessonType,
            description: lesson.description,
            content: lesson.content,
            resourceUrl: lesson.resourceUrl,
            durationSeconds: Number(lesson.durationSeconds || 0),
            freePreview: Boolean(lesson.freePreview),
            order: Number(lesson.order || 0),
            isPublished: lesson.isPublished !== false
          })) : []
      })) : [],
    updatedAt: value.updatedAt ? new Date(value.updatedAt).toISOString() : null
  }
}

export const CourseCurriculum = mongoose.models.CourseCurriculum || mongoose.model('CourseCurriculum', courseCurriculumSchema)
export default CourseCurriculum
