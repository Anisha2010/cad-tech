import mongoose from 'mongoose'
import { Enrollment, serializeEnrollment } from '../models/Enrollment.js'

const validUserId = (userId) => mongoose.isValidObjectId(userId)

export const findActiveEnrollment = async (userId, courseId, options = {}) => {
  if (!validUserId(userId) || !validUserId(courseId)) return null
  return Enrollment.findOne({ userId, courseId, status: { $in: ['active', 'completed'] } }).session(options.session || null).lean()
}

export const createVerifiedEnrollment = async ({ userId, courseId, paymentId = null }, options = {}) => {
  if (!validUserId(userId) || !validUserId(courseId)) return null
  const safePaymentId = mongoose.isValidObjectId(paymentId) ? paymentId : null
  try {
    return await Enrollment.findOneAndUpdate(
      { userId, courseId },
      { $setOnInsert: { userId, courseId, paymentId: safePaymentId, status: 'active', progressPercentage: 0, enrolledAt: new Date(), lastAccessedAt: null, completedAt: null } },
      { new: true, upsert: true, setDefaultsOnInsert: true, session: options.session }
    ).lean()
  } catch (error) {
    if (error?.code === 11000) return Enrollment.findOne({ userId, courseId }).lean()
    throw error
  }
}

export const getStudentEnrollments = async ({ userId, status, search, page = 1, limit = 12 }) => {
  const filter = { userId: new mongoose.Types.ObjectId(userId) }
  if (status && status !== 'all') filter.status = status
  const pipeline = [{ $match: filter }, { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'course' } }, { $unwind: '$course' }]
  if (search) pipeline.push({ $match: { $or: [{ 'course.title': { $regex: search, $options: 'i' } }, { 'course.software': { $regex: search, $options: 'i' } }, { 'course.category': { $regex: search, $options: 'i' } }] } })
  const countResult = await Enrollment.aggregate([...pipeline, { $count: 'totalItems' }])
  const totalItems = countResult[0]?.totalItems || 0
  const rows = await Enrollment.aggregate([...pipeline, { $sort: { enrolledAt: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }])
  return { enrollments: rows.map(serializeEnrollment), totalItems }
}

export const getStudentEnrollmentSummary = async (userId) => {
  const [summary] = await Enrollment.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(userId), status: { $in: ['active', 'completed'] } } }, { $group: { _id: null, totalEnrollments: { $sum: 1 }, inProgress: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'active'] }, { $lt: ['$progressPercentage', 100] }] }, 1, 0] } }, completed: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'completed'] }, { $eq: ['$progressPercentage', 100] }] }, 1, 0] } } } }])
  return { totalEnrollments: summary?.totalEnrollments || 0, inProgress: summary?.inProgress || 0, completed: summary?.completed || 0 }
}

export const getContinueLearningCourses = async (userId, limit = 3) => {
  const rows = await Enrollment.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(userId), status: 'active', progressPercentage: { $lt: 100 } } }, { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'courseId' } }, { $unwind: '$courseId' }, { $sort: { lastAccessedAt: -1, enrolledAt: -1 } }, { $limit: limit }])
  return rows.map(serializeEnrollment)
}

export const getRecentEnrollments = async (userId, limit = 5) => {
  const rows = await Enrollment.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(userId) } }, { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'courseId' } }, { $unwind: '$courseId' }, { $sort: { enrolledAt: -1 } }, { $limit: limit }])
  return rows.map(serializeEnrollment)
}