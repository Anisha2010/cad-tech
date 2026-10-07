import test from 'node:test'
import assert from 'node:assert/strict'

import { buildSlugFromTitle, normalizeCmsListItem } from '../src/utils/siteContent.js'

test('buildSlugFromTitle creates a stable slug', () => {
  assert.equal(buildSlugFromTitle('CAD Design Services'), 'cad-design-services')
})

test('normalizeCmsListItem trims and filters empty values', () => {
  assert.deepEqual(normalizeCmsListItem(['  One ', '', 'Two  ']), ['One', 'Two'])
})
