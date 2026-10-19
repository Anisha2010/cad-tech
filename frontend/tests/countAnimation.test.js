import test from 'node:test'
import assert from 'node:assert/strict'
import { formatCountValue, getCountAnimationConfig } from '../src/utils/countAnimation.js'

test('formats large marketing values while preserving their suffixes', () => {
  assert.deepEqual(getCountAnimationConfig('25K+'), { start: 0, end: 25000, prefix: '', suffix: 'K+', minimumFractionDigits: 0, maximumFractionDigits: 0, divider: 1000 })
  assert.deepEqual(getCountAnimationConfig('7+'), { start: 0, end: 7, prefix: '', suffix: '+', minimumFractionDigits: 0, maximumFractionDigits: 0, divider: 1 })
  assert.deepEqual(getCountAnimationConfig('120+'), { start: 0, end: 120, prefix: '', suffix: '+', minimumFractionDigits: 0, maximumFractionDigits: 0, divider: 1 })
})

test('animates to the fully scaled count without losing the suffix', () => {
  assert.equal(formatCountValue('25K+', getCountAnimationConfig('25K+').end), '25K+')
  assert.equal(formatCountValue('15K+', getCountAnimationConfig('15K+').end), '15K+')
})

test('formats intermediate values without changing the display suffix', () => {
  assert.equal(formatCountValue('15K+', 0), '0K+')
  assert.equal(formatCountValue('15K+', 15000), '15K+')
  assert.equal(formatCountValue('7+', 7), '7+')
  assert.equal(formatCountValue('120+', 120), '120+')
})
