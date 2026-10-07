import test from 'node:test'
import assert from 'node:assert/strict'
import { createAdminRecordService } from '../src/services/adminDashboardService.js'

const makeModel = (rows, totalItems = rows.length) => {
  const captured = {}
  const query = {
    select(projection) { captured.projection = projection; return this },
    populate(reference) { (captured.populate ||= []).push(reference); return this },
    sort(sort) { captured.sort = sort; return this },
    skip(skip) { captured.skip = skip; return this },
    limit(limit) { captured.limit = limit; return this },
    lean: async () => rows
  }
  return {
    captured,
    find(filter) { captured.filter = filter; return query },
    async countDocuments(filter) { assert.deepEqual(filter, captured.filter); return totalItems }
  }
}

test('admin enrollment list filters and paginates safe populated fields', async () => {
  const enrollment = makeModel([{
    _id: 'enrollment-1',
    userId: { _id: 'student-1', name: 'Student One', email: 'student@example.com' },
    courseId: { _id: 'course-1', title: 'CAD Basics', slug: 'cad-basics' },
    status: 'active',
    progressPercentage: 40,
    enrolledAt: new Date('2026-01-02T00:00:00.000Z'),
    lastAccessedAt: null,
    lessonProgress: [{ title: 'private payload not selected' }]
  }], 31)
  const service = createAdminRecordService({ enrollmentModel: enrollment })
  const result = await service.listEnrollments({ status: 'active', page: 2, limit: 10 })

  assert.deepEqual(enrollment.captured.filter, { status: 'active' })
  assert.equal(enrollment.captured.skip, 10)
  assert.equal(enrollment.captured.limit, 10)
  assert.deepEqual(result.pagination, { page: 2, limit: 10, totalItems: 31, totalPages: 4 })
  assert.deepEqual(result.records[0], {
    id: 'enrollment-1',
    student: { id: 'student-1', name: 'Student One', email: 'student@example.com' },
    course: { id: 'course-1', title: 'CAD Basics', slug: 'cad-basics' },
    status: 'active',
    progressPercentage: 40,
    enrolledAt: '2026-01-02T00:00:00.000Z',
    lastAccessedAt: null
  })
  assert.equal(JSON.stringify(result).includes('private payload'), false)
})

test('admin payment list exposes transaction references but omits unrelated fields', async () => {
  const payment = makeModel([{
    _id: 'payment-1',
    userId: { _id: 'student-1', name: 'Student One', email: 'student@example.com' },
    courseId: { _id: 'course-1', title: 'CAD Basics', slug: 'cad-basics' },
    provider: 'razorpay',
    providerOrderId: 'order-1',
    providerPaymentId: 'payment-ref-1',
    amountInPaise: 250000,
    currency: 'INR',
    status: 'paid',
    createdAt: new Date('2026-02-03T00:00:00.000Z'),
    verifiedAt: null,
    failureDescription: 'must not be returned'
  }])
  const service = createAdminRecordService({ paymentModel: payment })
  const result = await service.listPayments({ status: 'paid' })

  assert.deepEqual(payment.captured.filter, { status: 'paid' })
  assert.equal(result.records[0].providerOrderId, 'order-1')
  assert.equal(result.records[0].amountInPaise, 250000)
  assert.equal(result.records[0].createdAt, '2026-02-03T00:00:00.000Z')
  assert.equal(JSON.stringify(result).includes('must not be returned'), false)
})

test('admin record lists reject unsupported filters and pagination values', async () => {
  const service = createAdminRecordService({ enrollmentModel: makeModel([]), paymentModel: makeModel([]) })
  await assert.rejects(service.listEnrollments({ status: 'refunded' }), /Invalid record status filter/)
  await assert.rejects(service.listPayments({ limit: 101 }), /limit must be between/)
})