import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveVideoResource } from '../src/pages/student/LearningPlayer/videoResource.js'

test('direct web video URLs use the native video player', () => {
  assert.deepEqual(resolveVideoResource('https://cdn.example.test/lesson.mp4?token=abc'), {
    type: 'file',
    src: 'https://cdn.example.test/lesson.mp4?token=abc'
  })
  assert.equal(resolveVideoResource('https://cdn.example.test/lesson.webm')?.type, 'file')
})

test('YouTube watch and short links become privacy-enhanced embeds', () => {
  assert.deepEqual(resolveVideoResource('https://www.youtube.com/watch?v=AbC_123'), {
    type: 'embed',
    src: 'https://www.youtube-nocookie.com/embed/AbC_123'
  })
  assert.equal(resolveVideoResource('https://youtu.be/AbC_123?t=12')?.src, 'https://www.youtube-nocookie.com/embed/AbC_123')
})

test('Vimeo links become player embeds', () => {
  assert.equal(resolveVideoResource('https://vimeo.com/123456')?.src, 'https://player.vimeo.com/video/123456')
  assert.equal(resolveVideoResource('https://player.vimeo.com/video/123456')?.src, 'https://player.vimeo.com/video/123456')
})

test('unsupported or unsafe URLs return null for link fallback', () => {
  assert.equal(resolveVideoResource('https://files.example.test/lesson.pdf'), null)
  assert.equal(resolveVideoResource('javascript:alert(1)'), null)
  assert.equal(resolveVideoResource('not a url'), null)
})