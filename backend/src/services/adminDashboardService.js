import { User } from '../models/User.js'
import { Course } from '../models/Course.js'
import { Enrollment } from '../models/Enrollment.js'
import { Payment } from '../models/Payment.js'

const RECENT_LIMIT = 5

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

export default { getAdminDashboard }