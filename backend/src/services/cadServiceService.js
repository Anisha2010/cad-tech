import mongoose from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { CadService } from '../models/CadService.js'
import { CadServiceEnquiry } from '../models/CadServiceEnquiry.js'
import { CadServiceQuotation } from '../models/CadServiceQuotation.js'
import { CadServiceMessage } from '../models/CadServiceMessage.js'
import {
  getPublishedCadServices,
  findCadServiceById,
  findCadServiceBySlug,
  slugExists,
  listCadServicesForAdmin,
  createCadServiceRecord,
  updateCadServiceRecord,
  generateReferenceNumber,
  createCadServiceEnquiryRecord,
  findEnquiryById,
  listEnquiriesForUser,
  listEnquiriesForAdmin,
  createCadServiceMessageRecord,
  getEnquiryMessages,
  createCadServiceQuotationRecord,
  updateCadServiceQuotationRecord,
  findLatestQuotationForEnquiry,
  listQuotationsForEnquiry,
  getActiveQuotationForEnquiry
} from '../repositories/cadServiceRepository.js'

const allowedServiceStatuses = ['draft', 'published', 'archived']
const allowedEnquiryStatuses = ['submitted', 'under_review', 'clarification_required', 'quoted', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled']
const statusTransitions = {
  submitted: ['under_review'],
  under_review: ['clarification_required', 'quoted'],
  clarification_required: ['under_review', 'quoted'],
  quoted: ['accepted', 'declined'],
  accepted: ['in_progress'],
  declined: [],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
}

const normalizeText = (value) => typeof value === 'string' ? value.trim() : ''
const normalizeList = (value, limit = 20) => {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, limit)
}

const sanitizeFileName = (value) => {
  const base = normalizeText(value) || 'uploaded-file'
  return base.replace(/[\\/]+/g, ' ').replace(/\s+/g, ' ').replace(/[^a-zA-Z0-9._-]+/g, '-')
}

const validateAttachment = (attachment) => {
  if (!attachment || typeof attachment !== 'object') throw new AppError('Attachment data is invalid.', 400)

  const originalFileName = sanitizeFileName(attachment.originalFileName || attachment.name)
  const extension = String(attachment.extension || '').trim().toLowerCase()
  const mimeType = String(attachment.mimeType || '').trim().toLowerCase()
  const sizeBytes = Number(attachment.sizeBytes || 0)

  const allowedExtensions = new Set(['pdf', 'dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'stl', 'obj', 'fbx', 'sldprt', 'sldasm', 'zip', 'png', 'jpg', 'jpeg'])
  if (!originalFileName || !extension || !allowedExtensions.has(extension.replace('.', ''))) {
    throw new AppError('Unsupported attachment type.', 400)
  }

  if (Number.isNaN(sizeBytes) || sizeBytes <= 0 || sizeBytes > 25 * 1024 * 1024) {
    throw new AppError('Each attachment must be under 25 MB.', 400)
  }

  return {
    storageProvider: 'cloudinary',
    storageAssetId: String(attachment.storageAssetId || '').trim() || `attachment-${Date.now()}`,
    originalFileName,
    extension: extension.replace('.', '').toLowerCase(),
    mimeType: mimeType || 'application/octet-stream',
    sizeBytes,
    uploadedAt: new Date()
  }
}

export const getPublicCadServices = async ({ search = '', category = '', software = '' } = {}) => {
  return getPublishedCadServices({ search, category, software, page: 1, limit: 50 })
}

export const getCadServiceBySlug = async (slug) => {
  const service = await findCadServiceBySlug(slug)
  if (!service) return null
  return service
}

export const createCadService = async ({ userId, payload = {} }) => {
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const title = normalizeText(payload.title)
  const slug = normalizeText(payload.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
  const shortDescription = normalizeText(payload.shortDescription)
  const description = normalizeText(payload.description)
  const category = normalizeText(payload.category) || 'General CAD'
  const features = normalizeList(payload.features, 12)
  const deliverables = normalizeList(payload.deliverables, 12)
  const supportedSoftware = normalizeList(payload.supportedSoftware, 12)
  const thumbnail = typeof payload.thumbnail === 'string' ? payload.thumbnail.trim() : null
  const startingPriceInPaise = payload.startingPriceInPaise === null || payload.startingPriceInPaise === undefined ? null : Number(payload.startingPriceInPaise)
  const estimatedDeliveryDays = payload.estimatedDeliveryDays === null || payload.estimatedDeliveryDays === undefined ? null : Number(payload.estimatedDeliveryDays)
  const status = allowedServiceStatuses.includes(payload.status) ? payload.status : 'draft'
  const displayOrder = Number.isInteger(Number(payload.displayOrder)) ? Number(payload.displayOrder) : 0

  if (!title || !shortDescription || !description) throw new AppError('Service title, summary and description are required.', 400)
  if (!slug) throw new AppError('Service slug is required.', 400)
  if (Number.isInteger(startingPriceInPaise) && startingPriceInPaise < 0) throw new AppError('Starting price cannot be negative.', 400)
  if (Number.isInteger(estimatedDeliveryDays) && estimatedDeliveryDays < 1) throw new AppError('Estimated delivery must be at least 1 day.', 400)
  if (await slugExists(slug)) throw new AppError('A service with this slug already exists.', 409)

  const service = await createCadServiceRecord({
    title,
    slug,
    shortDescription,
    description,
    category,
    features,
    deliverables,
    supportedSoftware,
    thumbnail,
    startingPriceInPaise: Number.isInteger(startingPriceInPaise) ? startingPriceInPaise : null,
    estimatedDeliveryDays: Number.isInteger(estimatedDeliveryDays) ? estimatedDeliveryDays : null,
    status,
    displayOrder,
    createdBy: userId,
    updatedBy: userId
  })

  return service
}

export const listAdminCadServices = async (filters = {}) => listCadServicesForAdmin({ search: filters.search || '', status: filters.status || 'all', page: filters.page || 1, limit: filters.limit || 20 })

export const getAdminCadService = async (serviceId) => {
  const service = await findCadServiceById(serviceId)
  if (!service) return null
  return service
}

export const updateCadService = async ({ serviceId, userId, payload = {} }) => {
  if (!mongoose.isValidObjectId(serviceId)) return null
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const current = await findCadServiceById(serviceId)
  if (!current) return null

  const updates = {}
  if (payload.title !== undefined) updates.title = normalizeText(payload.title)
  if (payload.slug !== undefined) updates.slug = normalizeText(payload.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
  if (payload.shortDescription !== undefined) updates.shortDescription = normalizeText(payload.shortDescription)
  if (payload.description !== undefined) updates.description = normalizeText(payload.description)
  if (payload.category !== undefined) updates.category = normalizeText(payload.category) || 'General CAD'
  if (payload.features !== undefined) updates.features = normalizeList(payload.features, 12)
  if (payload.deliverables !== undefined) updates.deliverables = normalizeList(payload.deliverables, 12)
  if (payload.supportedSoftware !== undefined) updates.supportedSoftware = normalizeList(payload.supportedSoftware, 12)
  if (payload.thumbnail !== undefined) updates.thumbnail = typeof payload.thumbnail === 'string' ? payload.thumbnail.trim() : null
  if (payload.startingPriceInPaise !== undefined) updates.startingPriceInPaise = payload.startingPriceInPaise === null || payload.startingPriceInPaise === '' ? null : Number(payload.startingPriceInPaise)
  if (payload.estimatedDeliveryDays !== undefined) updates.estimatedDeliveryDays = payload.estimatedDeliveryDays === null || payload.estimatedDeliveryDays === '' ? null : Number(payload.estimatedDeliveryDays)
  if (payload.status !== undefined) updates.status = allowedServiceStatuses.includes(payload.status) ? payload.status : current.status
  if (payload.displayOrder !== undefined) updates.displayOrder = Number.isInteger(Number(payload.displayOrder)) ? Number(payload.displayOrder) : current.displayOrder
  updates.updatedBy = userId

  if (!updates.title || !updates.shortDescription || !updates.description) {
    throw new AppError('Service title, summary and description are required.', 400)
  }
  if (!updates.slug) throw new AppError('Service slug is required.', 400)
  if (updates.startingPriceInPaise !== null && updates.startingPriceInPaise < 0) throw new AppError('Starting price cannot be negative.', 400)
  if (updates.estimatedDeliveryDays !== null && updates.estimatedDeliveryDays < 1) throw new AppError('Estimated delivery must be at least 1 day.', 400)

  const duplicate = await slugExists(updates.slug, serviceId)
  if (duplicate) throw new AppError('A service with this slug already exists.', 409)

  return updateCadServiceRecord(serviceId, updates)
}

export const updateCadServiceStatus = async ({ serviceId, userId, status }) => {
  if (!mongoose.isValidObjectId(serviceId)) return null
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const current = await findCadServiceById(serviceId)
  if (!current) return null

  if (!allowedServiceStatuses.includes(status)) throw new AppError('Invalid status value.', 400)

  return updateCadServiceRecord(serviceId, { status, updatedBy: userId })
}

export const createCadServiceEnquiry = async ({ userId, payload = {} }) => {
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)

  const serviceId = payload.serviceId
  if (!mongoose.isValidObjectId(serviceId)) throw new AppError('Valid service is required.', 400)

  const service = await findCadServiceById(serviceId)
  if (!service) throw new AppError('Service not found.', 404)
  if (service.status !== 'published') throw new AppError('This service is not available for new enquiries.', 400)

  const projectTitle = normalizeText(payload.projectTitle)
  const projectDescription = normalizeText(payload.projectDescription)
  const preferredSoftware = normalizeText(payload.preferredSoftware)
  const requiredFileFormats = normalizeList(payload.requiredFileFormats, 10)
  const expectedDeliveryDate = payload.expectedDeliveryDate ? new Date(payload.expectedDeliveryDate) : null
  const budgetInPaise = payload.budgetInPaise === null || payload.budgetInPaise === undefined || payload.budgetInPaise === '' ? null : Number(payload.budgetInPaise)
  const customerPhone = normalizeText(payload.customerPhone || payload.phone)

  if (!projectTitle || projectTitle.length < 8) throw new AppError('Project title must be at least 8 characters long.', 400)
  if (!projectDescription || projectDescription.length < 20) throw new AppError('Project description must be at least 20 characters long.', 400)
  if (expectedDeliveryDate && Number.isNaN(expectedDeliveryDate.getTime())) throw new AppError('Expected delivery date is invalid.', 400)
  if (expectedDeliveryDate && expectedDeliveryDate < new Date()) throw new AppError('Expected delivery date cannot be in the past.', 400)
  if (budgetInPaise !== null && (!Number.isInteger(budgetInPaise) || budgetInPaise <= 0)) throw new AppError('Budget must be a positive integer in paise.', 400)
  if (customerPhone && customerPhone.length < 8) throw new AppError('Phone number is too short to be valid.', 400)

  const user = await mongoose.model('User').findById(userId).lean()
  if (!user) throw new AppError('Customer account is not available.', 401)

  const attachments = Array.isArray(payload.attachments) ? payload.attachments.map(validateAttachment) : []
  const referenceNumber = await generateReferenceNumber()

  const enquiry = await createCadServiceEnquiryRecord({
    referenceNumber,
    serviceId,
    userId,
    customerName: user.name || 'Student User',
    customerEmail: user.email || '',
    customerPhone: customerPhone || user.phone || null,
    projectTitle,
    projectDescription,
    preferredSoftware: preferredSoftware || null,
    requiredFileFormats,
    expectedDeliveryDate: expectedDeliveryDate || null,
    budgetInPaise,
    attachments,
    status: 'submitted'
  })

  return { ...enquiry, service }
}

export const listStudentEnquiries = async ({ userId, status = 'all', page = 1, limit = 20 } = {}) => {
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)
  return listEnquiriesForUser({ userId, status, page, limit })
}

export const getStudentEnquiry = async ({ userId, enquiryId }) => {
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)
  if (!mongoose.isValidObjectId(enquiryId)) return null

  const enquiry = await findEnquiryById(enquiryId)
  if (!enquiry || String(enquiry.userId) !== String(userId)) return null

  const service = enquiry.serviceId ? await findCadServiceById(enquiry.serviceId) : null
  const messages = await getEnquiryMessages(enquiryId)
  const quotations = await listQuotationsForEnquiry(enquiryId)
  const activeQuotation = await getActiveQuotationForEnquiry(enquiryId)

  return { enquiry, service, messages, quotations, activeQuotation }
}

export const addEnquiryMessage = async ({ userId, enquiryId, messageText }) => {
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)
  if (!mongoose.isValidObjectId(enquiryId)) return null

  const enquiry = await findEnquiryById(enquiryId)
  if (!enquiry) return null
  if (String(enquiry.userId) !== String(userId)) throw new AppError('You do not have access to this enquiry.', 403)

  const safeMessage = normalizeText(messageText)
  if (!safeMessage || safeMessage.length > 4000) throw new AppError('Message must be between 1 and 4000 characters.', 400)

  return createCadServiceMessageRecord({
    enquiryId,
    senderId: userId,
    senderRole: 'student',
    message: safeMessage,
    attachments: []
  })
}

export const acceptQuotedEnquiry = async ({ userId, enquiryId }) => {
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)
  if (!mongoose.isValidObjectId(enquiryId)) return null

  const enquiry = await findEnquiryById(enquiryId)
  if (!enquiry || String(enquiry.userId) !== String(userId)) return null

  const activeQuotation = await getActiveQuotationForEnquiry(enquiryId)
  if (!activeQuotation) throw new AppError('No active quotation is available to accept.', 400)
  if (new Date(activeQuotation.validUntil) < new Date()) throw new AppError('This quotation has expired.', 400)

  const updatedQuotation = await updateCadServiceQuotationRecord(activeQuotation._id, {
    status: 'accepted',
    respondedAt: new Date()
  })

  await CadServiceEnquiry.findByIdAndUpdate(enquiryId, { $set: { status: 'accepted', updatedAt: new Date() } })
  return { quotation: updatedQuotation }
}

export const declineQuotedEnquiry = async ({ userId, enquiryId, reason = '' }) => {
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)
  if (!mongoose.isValidObjectId(enquiryId)) return null

  const enquiry = await findEnquiryById(enquiryId)
  if (!enquiry || String(enquiry.userId) !== String(userId)) return null

  const activeQuotation = await getActiveQuotationForEnquiry(enquiryId)
  if (!activeQuotation) throw new AppError('No active quotation is available to decline.', 400)

  const updatedQuotation = await updateCadServiceQuotationRecord(activeQuotation._id, {
    status: 'declined',
    respondedAt: new Date()
  })

  await CadServiceEnquiry.findByIdAndUpdate(enquiryId, { $set: { status: 'declined', updatedAt: new Date() } })

  if (reason) {
    await createCadServiceMessageRecord({
      enquiryId,
      senderId: userId,
      senderRole: 'student',
      message: `Quotation declined: ${normalizeText(reason).slice(0, 500)}`,
      attachments: []
    })
  }

  return { quotation: updatedQuotation }
}

export const cancelEnquiry = async ({ userId, enquiryId }) => {
  if (!mongoose.isValidObjectId(userId)) throw new AppError('Authentication required.', 401)
  if (!mongoose.isValidObjectId(enquiryId)) return null

  const enquiry = await findEnquiryById(enquiryId)
  if (!enquiry || String(enquiry.userId) !== String(userId)) return null

  if (['completed', 'cancelled'].includes(enquiry.status)) return { enquiry: await findEnquiryById(enquiryId) }

  const updated = await CadServiceEnquiry.findByIdAndUpdate(enquiryId, { $set: { status: 'cancelled', updatedAt: new Date() } }, { new: true }).lean()
  return { enquiry: updated }
}

export const listAdminEnquiries = async ({ status = 'all', search = '', page = 1, limit = 20 } = {}) => listEnquiriesForAdmin({ status, page, limit })

export const getAdminEnquiry = async (enquiryId) => {
  const enquiry = await findEnquiryById(enquiryId)
  if (!enquiry) return null

  const service = enquiry.serviceId ? await findCadServiceById(enquiry.serviceId) : null
  const messages = await getEnquiryMessages(enquiryId)
  const quotations = await listQuotationsForEnquiry(enquiryId)
  const activeQuotation = await getActiveQuotationForEnquiry(enquiryId)

  return { enquiry, service, messages, quotations, activeQuotation }
}

export const updateEnquiryStatus = async ({ adminUserId, enquiryId, status }) => {
  if (!mongoose.isValidObjectId(adminUserId)) throw new AppError('Authentication required.', 401)
  if (!mongoose.isValidObjectId(enquiryId)) return null

  const enquiry = await findEnquiryById(enquiryId)
  if (!enquiry) return null

  if (!allowedEnquiryStatuses.includes(status)) throw new AppError('Invalid enquiry status.', 400)
  if (!statusTransitions[enquiry.status]?.includes(status)) throw new AppError('This status transition is not allowed.', 400)

  const updated = await CadServiceEnquiry.findByIdAndUpdate(enquiryId, { $set: { status, updatedAt: new Date() } }, { new: true }).lean()
  return updated
}

export const assignEnquiry = async ({ adminUserId, enquiryId, assigneeId }) => {
  if (!mongoose.isValidObjectId(adminUserId)) throw new AppError('Authentication required.', 401)
  if (!mongoose.isValidObjectId(enquiryId)) return null

  const enquiry = await findEnquiryById(enquiryId)
  if (!enquiry) return null

  const validAssignee = assigneeId && mongoose.isValidObjectId(assigneeId) ? assigneeId : null
  return CadServiceEnquiry.findByIdAndUpdate(enquiryId, { $set: { adminAssignedTo: validAssignee, updatedAt: new Date() } }, { new: true }).lean()
}

export const createQuotation = async ({ adminUserId, enquiryId, payload = {} }) => {
  if (!mongoose.isValidObjectId(adminUserId)) throw new AppError('Authentication required.', 401)
  if (!mongoose.isValidObjectId(enquiryId)) return null

  const enquiry = await findEnquiryById(enquiryId)
  if (!enquiry) return null
  if (['completed', 'cancelled'].includes(enquiry.status)) throw new AppError('Quotation creation is not available for completed or cancelled requests.', 400)

  const amountInPaise = Number(payload.amountInPaise)
  const estimatedDeliveryDays = Number(payload.estimatedDeliveryDays)
  const scopeOfWork = normalizeText(payload.scopeOfWork)
  const deliverables = normalizeList(payload.deliverables, 10)
  const terms = normalizeList(payload.terms, 10)
  const validUntil = payload.validUntil ? new Date(payload.validUntil) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) throw new AppError('Quotation amount must be a positive integer in paise.', 400)
  if (!scopeOfWork || scopeOfWork.length < 20) throw new AppError('Scope of work must be meaningful.', 400)
  if (!Number.isInteger(estimatedDeliveryDays) || estimatedDeliveryDays < 1) throw new AppError('Estimated delivery days must be at least 1.', 400)
  if (Number.isNaN(validUntil.getTime())) throw new AppError('Quotation expiry date is invalid.', 400)

  const latest = await findLatestQuotationForEnquiry(enquiryId)
  const version = latest ? latest.version + 1 : 1

  const quotation = await createCadServiceQuotationRecord({
    enquiryId,
    version,
    amountInPaise,
    currency: 'INR',
    scopeOfWork,
    deliverables,
    terms,
    estimatedDeliveryDays,
    validUntil,
    status: 'draft',
    createdBy: adminUserId,
    sentAt: null,
    respondedAt: null
  })

  return quotation
}

export const sendQuotation = async ({ adminUserId, enquiryId, quotationId }) => {
  if (!mongoose.isValidObjectId(adminUserId)) throw new AppError('Authentication required.', 401)
  if (!mongoose.isValidObjectId(enquiryId) || !mongoose.isValidObjectId(quotationId)) return null

  const quotation = await CadServiceQuotation.findById(quotationId).lean()
  if (!quotation || String(quotation.enquiryId) !== String(enquiryId)) return null
  if (quotation.status === 'accepted' || quotation.status === 'declined') throw new AppError('This quotation can no longer be sent.', 400)

  const sent = await updateCadServiceQuotationRecord(quotationId, {
    status: 'sent',
    sentAt: new Date(),
    respondedAt: null
  })

  await CadServiceEnquiry.findByIdAndUpdate(enquiryId, { $set: { status: 'quoted', updatedAt: new Date() } })
  return sent
}

export const addAdminMessage = async ({ adminUserId, enquiryId, messageText }) => {
  if (!mongoose.isValidObjectId(adminUserId)) throw new AppError('Authentication required.', 401)
  if (!mongoose.isValidObjectId(enquiryId)) return null

  const enquiry = await findEnquiryById(enquiryId)
  if (!enquiry) return null

  const safeMessage = normalizeText(messageText)
  if (!safeMessage || safeMessage.length > 4000) throw new AppError('Message must be between 1 and 4000 characters.', 400)

  return createCadServiceMessageRecord({
    enquiryId,
    senderId: adminUserId,
    senderRole: 'admin',
    message: safeMessage,
    attachments: []
  })
}

export default {
  getPublicCadServices,
  getCadServiceBySlug,
  createCadService,
  listAdminCadServices,
  getAdminCadService,
  updateCadService,
  updateCadServiceStatus,
  createCadServiceEnquiry,
  listStudentEnquiries,
  getStudentEnquiry,
  addEnquiryMessage,
  acceptQuotedEnquiry,
  declineQuotedEnquiry,
  cancelEnquiry,
  listAdminEnquiries,
  getAdminEnquiry,
  updateEnquiryStatus,
  assignEnquiry,
  createQuotation,
  sendQuotation,
  addAdminMessage
}
