import Razorpay from 'razorpay'
import config from './environment.js'

export const razorpayConfigured = Boolean(config.razorpay_key_id && config.razorpay_key_secret)
export const razorpay = razorpayConfigured
  ? new Razorpay({ key_id: config.razorpay_key_id, key_secret: config.razorpay_key_secret })
  : null

export const razorpayKeyId = config.razorpay_key_id
export const razorpayWebhookSecret = config.razorpay_webhook_secret