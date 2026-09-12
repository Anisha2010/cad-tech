import { WebhookEvent } from '../models/WebhookEvent.js'

export const claimWebhookEvent = async ({ provider, eventId, eventType }) => {
  try {
    return { event: await WebhookEvent.create({ provider, eventId, eventType, status: 'processing' }), claimed: true }
  } catch (error) {
    if (error?.code !== 11000) throw error
    const retry = await WebhookEvent.findOneAndUpdate({ provider, eventId, status: 'failed' }, { $set: { eventType, status: 'processing', processedAt: null } }, { new: true })
    if (retry) return { event: retry, claimed: true }
    return { event: await WebhookEvent.findOne({ provider, eventId }), claimed: false }
  }
}

export const markWebhookEventProcessed = (id) => WebhookEvent.findByIdAndUpdate(id, { status: 'processed', processedAt: new Date() }, { new: true })
export const markWebhookEventFailed = (id) => WebhookEvent.findByIdAndUpdate(id, { status: 'failed' }, { new: true })