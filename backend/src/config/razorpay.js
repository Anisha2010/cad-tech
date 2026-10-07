import Razorpay from 'razorpay'
import config from './environment.js'

export const getRazorpayConfigStatus = (runtimeConfig = config) => {
  const keyId = String(runtimeConfig.razorpay_key_id || '').trim()
  const keySecret = String(runtimeConfig.razorpay_key_secret || '').trim()
  const webhookSecret = String(runtimeConfig.razorpay_webhook_secret || '').trim()
  const keyIdTestMode = /^rzp_test_[A-Za-z0-9]+$/.test(keyId)

  return {
    keyIdPresent: Boolean(keyId),
    keySecretPresent: Boolean(keySecret),
    webhookSecretPresent: Boolean(webhookSecret),
    keyIdTestMode,
    configured: Boolean(keyIdTestMode && keySecret)
  }
}

const status = getRazorpayConfigStatus()
// console.info('[Razorpay] Required env presence check', {
//   keyIdPresent: status.keyIdPresent,
//   keySecretPresent: status.keySecretPresent,
//   webhookSecretPresent: status.webhookSecretPresent,
//   keyIdTestMode: status.keyIdTestMode
// })

export const razorpayConfigured = status.configured
export const razorpay = razorpayConfigured
  ? new Razorpay({ key_id: config.razorpay_key_id, key_secret: config.razorpay_key_secret })
  : null

export const razorpayKeyId = config.razorpay_key_id
export const razorpayWebhookSecret = config.razorpay_webhook_secret