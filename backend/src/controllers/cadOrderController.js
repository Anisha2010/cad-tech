import asyncHandler from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'
import * as cadOrderService from '../services/cadOrderService.js'

export const createCadOrder = asyncHandler(async (req, res) => sendSuccess(res, await cadOrderService.createOrder(req.user.id, req.body?.productSlug), 'CAD order created.'))

export const verifyCadPayment = asyncHandler(async (req, res) => sendSuccess(res, { order: await cadOrderService.verifyPayment({ userId: req.user.id, orderId: req.body?.razorpay_order_id, paymentId: req.body?.razorpay_payment_id, signature: req.body?.razorpay_signature }) }, 'CAD payment verified.'))

export const getCadOrder = asyncHandler(async (req, res) => {
  const order = await cadOrderService.getCadOrderForUser({ userId: req.user.id, orderId: req.params.orderId })
  if (!order) return res.status(404).json({ success: false, message: 'CAD order not found.' })
  return sendSuccess(res, { order }, 'CAD order retrieved successfully.')
})

export const listStudentCadOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.limit || 12)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) return res.status(400).json({ success: false, message: 'Invalid pagination values.' })
  const result = await cadOrderService.getStudentOrders({ userId: req.user.id, page, limit })
  sendSuccess(res, { orders: result.orders, pagination: { page, limit, totalItems: result.totalItems, totalPages: result.totalItems ? Math.ceil(result.totalItems / limit) : 0 } }, 'CAD orders retrieved successfully.')
})

export const listAdminCadOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.limit || 12)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) return res.status(400).json({ success: false, message: 'Invalid pagination values.' })
  const result = await cadOrderService.getAdminOrders({ page, limit })
  sendSuccess(res, { orders: result.orders, pagination: { page, limit, totalItems: result.totalItems, totalPages: result.totalPages } }, 'CAD orders retrieved successfully.')
})

export const webhook = asyncHandler(async (req, res) => { await cadOrderService.reconcileWebhook(req.body, req.headers['x-razorpay-signature']); sendSuccess(res, null, 'CAD webhook processed.') })
