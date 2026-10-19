import test from 'node:test'
import assert from 'node:assert/strict'
import { requireCourseSlug } from '../src/utils/courseSlug.js'

test('course slug validation rejects missing route identifiers and trims valid slugs', () => {
  for (const value of [undefined, null, '', '  ', 'undefined']) {
    assert.throws(() => requireCourseSlug(value), /valid course slug/i)
  }
  assert.equal(requireCourseSlug(' autocad-designing '), 'autocad-designing')
})
