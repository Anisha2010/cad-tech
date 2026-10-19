import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { Course } from '../src/models/Course.js'
import { CourseCurriculum } from '../src/models/CourseCurriculum.js'
import { createLesson, publishCurriculum, updateLesson } from '../src/services/adminCurriculumService.js'

const createCurriculumFixture = (t) => {
  const courseId = new mongoose.Types.ObjectId()
  let curriculum = {
    _id: new mongoose.Types.ObjectId(),
    courseId,
    courseSlug: 'curriculum-test',
    status: 'draft',
    isPublished: false,
    sections: [{
      id: 'section-1',
      title: 'Module One',
      description: '',
      order: 0,
      isPublished: false,
      archivedAt: null,
      lessons: []
    }]
  }

  t.mock.method(Course, 'findById', () => ({
    lean: async () => ({ _id: courseId, slug: 'curriculum-test' })
  }))
  t.mock.method(CourseCurriculum, 'findOne', () => ({
    lean: async () => structuredClone(curriculum)
  }))
  t.mock.method(CourseCurriculum, 'findOneAndUpdate', async (_filter, update) => {
    curriculum = { ...curriculum, ...structuredClone(update.$set) }
    return structuredClone(curriculum)
  })

  return {
    courseId: String(courseId),
    getCurriculum: () => structuredClone(curriculum)
  }
}

const createVideoLesson = async (courseId) => {
  const result = await createLesson({
    courseId,
    sectionId: 'section-1',
    payload: {
      title: 'New video lesson',
      type: 'video',
      videoUrl: 'https://cdn.example.com/lesson.mp4'
    }
  })
  return result.sections[0].lessons[0]
}

test('admin can publish a newly created video lesson with the lesson update endpoint', async (t) => {
  const { courseId, getCurriculum } = createCurriculumFixture(t)
  const lesson = await createVideoLesson(courseId)
  assert.equal(lesson.isPublished, false)

  await updateLesson({
    courseId,
    sectionId: 'section-1',
    lessonId: lesson.id,
    payload: { isPublished: true }
  })

  const savedLesson = getCurriculum().sections[0].lessons[0]
  assert.equal(savedLesson.isPublished, true)
  assert.equal(savedLesson.videoUrl, 'https://cdn.example.com/lesson.mp4')
})

test('curriculum can be published after at least one lesson is published', async (t) => {
  const { courseId, getCurriculum } = createCurriculumFixture(t)
  const lesson = await createVideoLesson(courseId)
  await updateLesson({
    courseId,
    sectionId: 'section-1',
    lessonId: lesson.id,
    payload: { isPublished: true }
  })

  const published = await publishCurriculum({ courseId, payload: { isPublished: true } })

  assert.equal(published.isPublished, true)
  assert.equal(published.status, 'published')
  assert.equal(getCurriculum().sections[0].lessons[0].isPublished, true)
})

test('saving a video lesson without a videoUrl preserves its existing URL', async (t) => {
  const { courseId } = createCurriculumFixture(t)
  const lesson = await createVideoLesson(courseId)

  const updated = await updateLesson({
    courseId,
    sectionId: 'section-1',
    lessonId: lesson.id,
    payload: { title: 'Updated title', description: 'Updated description', type: 'video' }
  })

  assert.equal(updated.sections[0].lessons[0].title, 'Updated title')
  assert.equal(updated.sections[0].lessons[0].videoUrl, 'https://cdn.example.com/lesson.mp4')
})

test('lesson publication requires a boolean and valid video content', async (t) => {
  const { courseId } = createCurriculumFixture(t)
  const lesson = await createVideoLesson(courseId)

  await assert.rejects(updateLesson({
    courseId,
    sectionId: 'section-1',
    lessonId: lesson.id,
    payload: { isPublished: 'true' }
  }), /isPublished must be a boolean/)

  await assert.rejects(updateLesson({
    courseId,
    sectionId: 'section-1',
    lessonId: lesson.id,
    payload: { type: 'article', isPublished: true }
  }), /Article lessons must include content before publishing/)
})
