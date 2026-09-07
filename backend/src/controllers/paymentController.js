import asyncHandler from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'
import * as paymentService from '../services/paymentService.js'

export const createOrder = asyncHandler(async (req, res) => sendSuccess(res, await paymentService.createOrder(req.user.id, req.body?.courseSlug), 'Payment order created.'))
export const verifyPayment = asyncHandler(async (req, res) => sendSuccess(res, { enrollment: paymentService.verifyPayment({ userId: req.user.id, orderId: req.body?.razorpay_order_id, paymentId: req.body?.razorpay_payment_id, signature: req.body?.razorpay_signature }) }, 'Payment verified.'))
export const webhook = asyncHandler(async (req, res) => { paymentService.reconcileWebhook(req.body, req.headers['x-razorpay-signature']); sendSuccess(res, null, 'Webhook processed.') })