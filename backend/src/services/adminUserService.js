import mongoose from 'mongoose'
import { Course } from '../models/Course.js'
import { Enrollment } from '../models/Enrollment.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'

const SAFE_USER_FIELDS = 'name email role avatarUrl emailVerified accountStatus createdAt lastLoginAt authVersion deletedAt'
const USER_ROLES = ['student', 'instructor']
const PAGE_SIZE_MAX = 100

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const asIso = (value) => value ? new Date(value).toISOString() : null

const serializeManagedUser = (user) => ({
  id: String(user._id || user.id),
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl || null,
  emailVerified: user.emailVerified !== false,
  accountStatus: user.accountStatus === 'deleted' ? 'deleted' : user.accountStatus === 'blocked' ? 'blocked' : 'active',
  createdAt: asIso(user.createdAt),
  lastLoginAt: asIso(user.lastLoginAt)
})

const normalizeListOptions = ({ role, status = 'all', verified = 'all', search = '', page = 1, limit = 20 } = {}) => {
  if (!USER_ROLES.includes(role)) throw new AppError('Role must be student or instructor.', 400)
  const parsedPage = Number(page)
  const parsedLimit = Number(limit)
  if (!Number.isInteger(parsedPage) || parsedPage < 1 || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > PAGE_SIZE_MAX) {
    throw new AppError(`Page must be positive and limit must be between 1 and ${PAGE_SIZE_MAX}.`, 400)
  }
  if (!['all', 'active', 'blocked'].includes(status)) throw new AppError('Invalid account status filter.', 400)
  if (!['all', 'verified', 'unverified'].includes(verified)) throw new AppError('Invalid email verification filter.', 400)
  return { role, status, verified, search: String(search).trim().slice(0, 100), page: parsedPage, limit: parsedLimit }
}

const makeListFilter = ({ role, status, verified, search }) => {
  const filter = { role, deletedAt: null, accountStatus: { $ne: 'deleted' } }
  if (status === 'active') filter.accountStatus = { $in: ['active', null] }
  if (status === 'blocked') filter.accountStatus = 'blocked'
  if (verified === 'verified') filter.emailVerified = { $ne: false }
  if (verified === 'unverified') filter.emailVerified = false
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i')
    filter.$and = [{ $or: [{ name: pattern }, { email: pattern }] }]
  }
  return filter
}

export const createAdminUserService = ({
  userModel = User,
  enrollmentModel = Enrollment,
  paymentModel = Payment,
  courseModel = Course
} = {}) => {
  const listUsers = async (options) => {
    const normalized = normalizeListOptions(options)
    const filter = makeListFilter(normalized)
    const [rows, totalItems] = await Promise.all([
      userModel.find(filter).select(SAFE_USER_FIELDS).sort({ createdAt: -1, _id: -1 }).skip((normalized.page - 1) * normalized.limit).limit(normalized.limit).lean(),
      userModel.countDocuments(filter)
    ])
    return {
      users: rows.map(serializeManagedUser),
      pagination: {
        page: normalized.page,
        limit: normalized.limit,
        totalItems,
        totalPages: totalItems ? Math.ceil(totalItems / normalized.limit) : 0
      }
    }
  }

  const getUser = async ({ userId, role }) => {
    if (!mongoose.isValidObjectId(userId) || !USER_ROLES.includes(role)) return null
    const user = await userModel.findOne({
      _id: userId,
      role,
      deletedAt: null,
      accountStatus: { $ne: 'deleted' }
    }).select(SAFE_USER_FIELDS).lean()
    if (!user) return null

    const details = { user: serializeManagedUser(user) }
    if (role === 'student') {
      const [enrollments, payments] = await Promise.all([
        enrollmentModel.find({ userId: user._id }).populate('courseId', 'title slug').sort({ enrolledAt: -1 }).lean(),
        paymentModel.find({ userId: user._id }).populate('courseId', 'title slug').sort({ createdAt: -1 }).lean()
      ])
      details.enrollments = enrollments.map((enrollment) => ({
        id: String(enrollment._id),
        course: enrollment.courseId ? { title: enrollment.courseId.title, slug: enrollment.courseId.slug } : null,
        status: enrollment.status,
        progressPercentage: enrollment.progressPercentage,
        enrolledAt: asIso(enrollment.enrolledAt),
        lastAccessedAt: asIso(enrollment.lastAccessedAt)
      }))
      details.payments = payments.map((payment) => ({
        id: String(payment._id),
        course: payment.courseId ? { title: payment.courseId.title, slug: payment.courseId.slug } : null,
        amountInPaise: payment.amountInPaise,
        currency: payment.currency,
        status: payment.status,
        createdAt: asIso(payment.createdAt),
        verifiedAt: asIso(payment.verifiedAt)
      }))
    } else {
      const courses = await courseModel.find({
        $or: [{ instructorId: user._id }, { createdBy: String(user._id) }]
      }).select('title slug status reviewStatus instructorId createdBy createdAt').sort({ createdAt: -1 }).lean()
      details.courses = courses.map((course) => ({
        id: String(course._id),
        title: course.title,
        slug: course.slug,
        status: course.status,
        reviewStatus: course.reviewStatus,
        relationship: String(course.instructorId || '') === String(user._id) ? 'assigned' : 'created',
        createdAt: asIso(course.createdAt)
      }))
      details.courseSummary = {
        total: courses.length,
        published: courses.filter((course) => course.status === 'published').length,
        draft: courses.filter((course) => course.status === 'draft').length
      }
    }
    return details
  }

  const setAccountStatus = async ({ actorId, userId, role, status }) => {
    if (!USER_ROLES.includes(role)) throw new AppError('Role must be student or instructor.', 400)
    if (!mongoose.isValidObjectId(userId)) return null
    if (String(actorId) === String(userId)) throw new AppError('You cannot change your own account status here.', 400)
    if (!['active', 'blocked'].includes(status)) throw new AppError('Account status must be active or blocked.', 400)
    const updated = await userModel.findOneAndUpdate({
      _id: userId,
      role,
      deletedAt: null,
      accountStatus: { $ne: 'deleted' }
    }, { $set: { accountStatus: status }, $inc: { authVersion: 1 } }, { new: true, runValidators: true }).select(SAFE_USER_FIELDS).lean()
    return updated ? serializeManagedUser(updated) : null
  }

  const softDeleteUser = async ({ actorId, userId, role }) => {
    if (!USER_ROLES.includes(role)) throw new AppError('Role must be student or instructor.', 400)
    if (!mongoose.isValidObjectId(userId)) return null
    if (String(actorId) === String(userId)) throw new AppError('You cannot delete your own account here.', 400)
    const updated = await userModel.findOneAndUpdate({
      _id: userId,
      role,
      deletedAt: null,
      accountStatus: { $ne: 'deleted' }
    }, { $set: { accountStatus: 'deleted', deletedAt: new Date() }, $inc: { authVersion: 1 } }, { new: true, runValidators: true }).select(SAFE_USER_FIELDS).lean()
    return updated ? serializeManagedUser(updated) : null
  }

  return { listUsers, getUser, setAccountStatus, softDeleteUser }
}

const service = createAdminUserService()
export const listAdminUsers = service.listUsers
export const getAdminUser = service.getUser
export const setAdminUserStatus = service.setAccountStatus
export const softDeleteAdminUser = service.softDeleteUser
export { makeListFilter, normalizeListOptions, serializeManagedUser }
