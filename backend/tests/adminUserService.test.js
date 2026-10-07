import test from 'node:test'
import assert from 'node:assert/strict'
import { createAdminUserService, makeListFilter, normalizeListOptions } from '../src/services/adminUserService.js'

const fakeQuery = (value) => ({
  select() { return this },
  sort() { return this },
  skip() { return this },
  limit() { return this },
  populate() { return this },
  lean: async () => value
})

const safeUser = {
  _id: '64b000000000000000000001',
  name: 'Student One',
  email: 'student@example.com',
  role: 'student',
  emailVerified: false,
  accountStatus: 'active',
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  lastLoginAt: null,
  passwordHash: 'should-never-escape',
  authProviders: [{ provider: 'local', providerUserId: 'internal-secret' }]
}

test('admin user filters restrict role, deleted accounts, search, status, and verification', () => {
  const filter = makeListFilter({ role: 'student', status: 'blocked', verified: 'unverified', search: 'a+b' })
  assert.equal(filter.role, 'student')
  assert.deepEqual(filter.deletedAt, null)
  assert.equal(filter.accountStatus, 'blocked')
  assert.equal(filter.emailVerified, false)
  assert.equal(filter.$and[0].$or[1].email.source, 'a\\+b')
  assert.throws(() => normalizeListOptions({ role: 'admin' }), /Role must be student or instructor/)
  assert.throws(() => normalizeListOptions({ role: 'student', limit: 101 }), /limit must be between/)
})

test('admin list returns only safe user fields and paginates', async () => {
  let capturedFilter
  let capturedProjection
  const userModel = {
    find(filter) {
      capturedFilter = filter
      return { ...fakeQuery([safeUser]), select(fields) { capturedProjection = fields; return this } }
    },
    async countDocuments(filter) { assert.equal(filter, capturedFilter); return 1 }
  }
  const service = createAdminUserService({ userModel })
  const result = await service.listUsers({ role: 'student', page: 2, limit: 10 })

  assert.equal(capturedFilter.role, 'student')
  assert.equal(capturedProjection.includes('passwordHash'), false)
  assert.deepEqual(result.pagination, { page: 2, limit: 10, totalItems: 1, totalPages: 1 })
  assert.deepEqual(result.users[0], {
    id: safeUser._id,
    name: safeUser.name,
    email: safeUser.email,
    role: 'student',
    avatarUrl: null,
    emailVerified: false,
    accountStatus: 'active',
    createdAt: '2026-01-02T00:00:00.000Z',
    lastLoginAt: null
  })
  assert.equal(JSON.stringify(result).includes('should-never-escape'), false)
  assert.equal(JSON.stringify(result).includes('internal-secret'), false)
})

test('status and soft-delete mutations are restricted to student/instructor and version sessions', async () => {
  const captured = []
  const userModel = {
    findOneAndUpdate(filter, update) {
      captured.push({ filter, update })
      return fakeQuery({ ...safeUser, ...update.$set, authVersion: 8 })
    }
  }
  const service = createAdminUserService({ userModel })
  const blocked = await service.setAccountStatus({ actorId: 'admin-id', userId: safeUser._id, role: 'student', status: 'blocked' })
  assert.equal(blocked.accountStatus, 'blocked')
  assert.equal(captured[0].filter.role, 'student')
  assert.deepEqual(captured[0].update.$inc, { authVersion: 1 })

  const deleted = await service.softDeleteUser({ actorId: 'admin-id', userId: safeUser._id, role: 'student' })
  assert.equal(deleted.accountStatus, 'deleted')
  assert.ok(captured[1].update.$set.deletedAt instanceof Date)
  assert.deepEqual(captured[1].update.$inc, { authVersion: 1 })
  assert.equal(Object.hasOwn(captured[1].update, '$unset'), false)

  await assert.rejects(service.setAccountStatus({ actorId: 'admin-id', userId: 'admin-id', role: 'admin', status: 'blocked' }), /Role must be student or instructor/)
  await assert.rejects(service.softDeleteUser({ actorId: 'admin-id', userId: 'admin-id', role: 'admin' }), /Role must be student or instructor/)
})

test('admin detail returns relevant enrollment/payment data without provider secrets', async () => {
  const userModel = { findOne: () => fakeQuery(safeUser) }
  const enrollmentModel = { find: () => fakeQuery([{ _id: 'enrollment-1', courseId: { title: 'CAD 101', slug: 'cad-101' }, status: 'active', progressPercentage: 25, enrolledAt: new Date('2026-02-01T00:00:00.000Z') }]) }
  const paymentModel = { find: () => fakeQuery([{ _id: 'payment-1', courseId: { title: 'CAD 101', slug: 'cad-101' }, amountInPaise: 12000, currency: 'INR', status: 'paid', providerPaymentId: 'secret-provider-id', createdAt: new Date('2026-02-01T00:00:00.000Z') }]) }
  const service = createAdminUserService({ userModel, enrollmentModel, paymentModel })
  const details = await service.getUser({ userId: safeUser._id, role: 'student' })

  assert.equal(details.enrollments[0].course.title, 'CAD 101')
  assert.equal(details.payments[0].amountInPaise, 12000)
  assert.equal(JSON.stringify(details).includes('secret-provider-id'), false)
  assert.equal(JSON.stringify(details).includes('should-never-escape'), false)
})
