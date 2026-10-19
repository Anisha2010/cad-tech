import test from 'node:test'
import assert from 'node:assert/strict'
import { serializeEnrollment } from '../src/models/Enrollment.js'

test('serializes course slug from the enrolled-course aggregation join', () => {
  const enrollment = serializeEnrollment({
    _id: '507f1f77bcf86cd799439013',
    courseId: '507f1f77bcf86cd799439012',
    course: {
      slug: 'autocad-designing',
      title: 'AutoCAD',
      software: 'AutoCAD',
      level: 'Beginner'
    },
    status: 'active',
    progressPercentage: 0,
    lessonProgress: []
  })

  assert.equal(enrollment.courseSlug, 'autocad-designing')
  assert.equal(enrollment.courseTitle, 'AutoCAD')
})
