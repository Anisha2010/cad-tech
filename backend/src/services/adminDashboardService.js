import { User } from '../models/User.js'
import { Course } from '../models/Course.js'
import { Enrollment } from '../models/Enrollment.js'
import { Payment } from '../models/Payment.js'
import { AppError } from '../utils/AppError.js'

const RECENT_LIMIT = 5
const ADMIN_PAGE_SIZE_MAX = 100

const normalizeAdminRecordOptions = ({ status = 'all', page = 1, limit = 20 } = {}, allowedStatuses) => {
  const parsedPage = Number(page)
  const parsedLimit = Number(limit)
  if (!allowedStatuses.includes(status)) throw new AppError('Invalid record status filter.', 400)
  if (!Number.isInteger(parsedPage) || parsedPage < 1 || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > ADMIN_PAGE_SIZE_MAX) {
    throw new AppError(`Page must be positive and limit must be between 1 and ${ADMIN_PAGE_SIZE_MAX}.`, 400)
  }
  return { status, page: parsedPage, limit: parsedLimit }
}

const asIso = (value) => value ? new Date(value).toISOString() : null
const serializeReference = (value) => value ? { id: String(value._id), name: value.name, email: value.email } : null
const serializeCourseReference = (value) => value ? { id: String(value._id), title: value.title, slug: value.slug } : null

export const createAdminRecordService = ({ enrollmentModel = Enrollment, paymentModel = Payment } = {}) => {
  const listRecords = async ({ model, options, allowedStatuses, projection, populate, sort, serialize }) => {
    const normalized = normalizeAdminRecordOptions(options, allowedStatuses)
    const filter = normalized.status === 'all' ? {} : { status: normalized.status }
    const [rows, totalItems] = await Promise.all([
      model.find(filter).select(projection).populate(populate[0]).populate(populate[1]).sort(sort)
        .skip((normalized.page - 1) * normalized.limit).limit(normalized.limit).lean(),
      model.countDocuments(filter)
    ])
    return {
      records: rows.map(serialize),
      pagination: {
        page: normalized.page,
        limit: normalized.limit,
        totalItems,
        totalPages: totalItems ? Math.ceil(totalItems / normalized.limit) : 0
      }
    }
  }

  const listEnrollments = (options = {}) => listRecords({
    model: enrollmentModel,
    options,
    allowedStatuses: ['all', 'active', 'completed', 'cancelled'],
    projection: 'userId courseId status progressPercentage enrolledAt lastAccessedAt',
    populate: [
      { path: 'userId', select: 'name email' },
      { path: 'courseId', select: 'title slug' }
    ],
    sort: { enrolledAt: -1, _id: -1 },
    serialize: (row) => ({
      id: String(row._id),
      student: serializeReference(row.userId),
      course: serializeCourseReference(row.courseId),
      status: row.status,
      progressPercentage: row.progressPercentage,
      enrolledAt: asIso(row.enrolledAt),
      lastAccessedAt: asIso(row.lastAccessedAt)
    })
  })

  const listPayments = (options = {}) => listRecords({
    model: paymentModel,
    options,
    allowedStatuses: ['all', 'creating', 'created', 'pending', 'paid', 'failed', 'refunded'],
    projection: 'userId courseId provider providerOrderId providerPaymentId amountInPaise currency status createdAt verifiedAt',
    populate: [
      { path: 'userId', select: 'name email' },
      { path: 'courseId', select: 'title slug' }
    ],
    sort: { createdAt: -1, _id: -1 },
    serialize: (row) => ({
      id: String(row._id),
      student: serializeReference(row.userId),
      course: serializeCourseReference(row.courseId),
      provider: row.provider,
      providerOrderId: row.providerOrderId,
      providerPaymentId: row.providerPaymentId || null,
      amountInPaise: row.amountInPaise,
      currency: row.currency,
      status: row.status,
      createdAt: asIso(row.createdAt),
      verifiedAt: asIso(row.verifiedAt)
    })
  })

  return { listEnrollments, listPayments }
}

const adminRecordService = createAdminRecordService()
export const listAdminEnrollments = adminRecordService.listEnrollments
export const listAdminPayments = adminRecordService.listPayments

const serializeRecentPayment = (payment) => ({
  id: String(payment._id),
  courseSlug: payment.courseId?.slug || null,
  amount: payment.amountInPaise,
  currency: payment.currency,
  status: payment.status,
  createdAt: payment.createdAt?.toISOString?.() || payment.createdAt
})

const serializeRecentEnrollment = (enrollment) => ({
  id: String(enrollment._id),
  courseSlug: enrollment.courseId?.slug || null,
  status: enrollment.status,
  progressPercentage: enrollment.progressPercentage,
  enrolledAt: enrollment.enrolledAt?.toISOString?.() || enrollment.enrolledAt,
  student: enrollment.userId ? {
    id: String(enrollment.userId._id),
    name: enrollment.userId.name,
    email: enrollment.userId.email
  } : null
})

export const getAdminDashboard = async () => {
  const [students, instructors, courses, publishedCourses, activeEnrollments, verifiedPayments, paidSummary, recentEnrollments, recentPayments] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'instructor' }),
    Course.countDocuments(),
    Course.countDocuments({ status: 'published' }),
    Enrollment.countDocuments({ status: 'active' }),
    Payment.countDocuments({ status: 'paid' }),
    Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, paidAmountInPaise: { $sum: '$amountInPaise' } } }
    ]),
    Enrollment.find({})
      .sort({ enrolledAt: -1 })
      .limit(RECENT_LIMIT)
      .populate({ path: 'courseId', select: 'slug' })
      .populate({ path: 'userId', select: 'name email' })
      .lean(),
    Payment.find({ status: 'paid' })
      .sort({ createdAt: -1 })
      .limit(RECENT_LIMIT)
      .populate({ path: 'courseId', select: 'slug' })
      .lean()
  ])

  return {
    counts: { students, instructors, courses, publishedCourses, activeEnrollments, verifiedPayments },
    paymentSummary: { currency: 'INR', paidAmountInPaise: Number(paidSummary[0]?.paidAmountInPaise || 0), mode: 'test' },
    recentEnrollments: recentEnrollments.map(serializeRecentEnrollment),
    recentPayments: recentPayments.map(serializeRecentPayment)
  }
}

export default { getAdminDashboard, listAdminEnrollments, listAdminPayments }