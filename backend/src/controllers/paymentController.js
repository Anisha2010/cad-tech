import asyncHandler from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'
import * as paymentService from '../services/paymentService.js'

export const createOrder = asyncHandler(async (req, res) => sendSuccess(res, await paymentService.createOrder(req.user.id, req.body?.courseSlug), 'Payment order created.'))
export const verifyPayment = asyncHandler(async (req, res) => sendSuccess(res, { enrollment: await paymentService.verifyPayment({ userId: req.user.id, orderId: req.body?.razorpay_order_id, paymentId: req.body?.razorpay_payment_id, signature: req.body?.razorpay_signature }) }, 'Payment verified.'))
export const webhook = asyncHandler(async (req, res) => { await paymentService.reconcileWebhook(req.body, req.headers['x-razorpay-signature']); sendSuccess(res, null, 'Webhook processed.') })

export const listStudentPayments = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.limit || 12)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) return res.status(400).json({ success: false, message: 'Invalid pagination values.' })
  const result = await paymentService.getStudentPayments({ userId: req.user.id, page, limit })
  sendSuccess(res, { payments: result.payments, pagination: { page, limit, totalItems: result.totalItems, totalPages: result.totalItems ? Math.ceil(result.totalItems / limit) : 0 } }, 'Payments retrieved successfully.')
})