import mongoose from 'mongoose'
import { CadService, serializeCadService } from '../models/CadService.js'
import { CadServiceEnquiry } from '../models/CadServiceEnquiry.js'
import { CadServiceQuotation } from '../models/CadServiceQuotation.js'
import { CadServiceMessage } from '../models/CadServiceMessage.js'

const escapeRegex = (value) => String(value || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const getPublishedCadServices = async ({ search = '', category = '', software = '', page = 1, limit = 12 } = {}) => {
  const safePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 12
  const maxLimit = Math.min(safeLimit, 50)
  const filter = { status: 'published' }

  if (category) filter.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' }
  if (software) filter.supportedSoftware = { $in: [String(software).trim()] }

  if (search) {
    const searchTerm = escapeRegex(search)
    filter.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { shortDescription: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { category: { $regex: searchTerm, $options: 'i' } }
    ]
  }

  const [totalItems, items] = await Promise.all([
    CadService.countDocuments(filter),
    CadService.find(filter).sort({ displayOrder: 1, createdAt: -1 }).skip((safePage - 1) * maxLimit).limit(maxLimit).lean()
  ])

  return {
    services: items.map(serializeCadService),
    totalItems,
    page: safePage,
    limit: maxLimit,
    totalPages: totalItems ? Math.ceil(totalItems / maxLimit) : 0
  }
}

export const findCadServiceById = async (serviceId) => {
  if (!mongoose.isValidObjectId(serviceId)) return null
  const service = await CadService.findById(serviceId).lean()
  return service ? serializeCadService(service) : null
}

export const findCadServiceBySlug = async (slug, { includeDraft = false, includeArchived = false } = {}) => {
  const normalized = String(slug || '').trim().toLowerCase()
  if (!normalized) return null
  const filter = { slug: normalized }
  if (!includeDraft && !includeArchived) filter.status = 'published'
  if (includeArchived && !includeDraft) filter.status = { $in: ['published', 'archived'] }
  const service = await CadService.findOne(filter).lean()
  return service ? serializeCadService(service) : null
}

export const slugExists = async (slug, excludeId = null) => {
  const normalized = String(slug || '').trim().toLowerCase()
  if (!normalized) return false
  const service = await CadService.findOne({ slug: normalized, _id: { $ne: excludeId || undefined } }).lean()
  return Boolean(service)
}

export const listCadServicesForAdmin = async ({ search = '', status = 'all', page = 1, limit = 20 } = {}) => {
  const safePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 20
  const maxLimit = Math.min(safeLimit, 50)
  const filter = {}

  if (status && status !== 'all') filter.status = status

  if (search) {
    const searchTerm = escapeRegex(search)
    filter.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { slug: { $regex: searchTerm, $options: 'i' } },
      { category: { $regex: searchTerm, $options: 'i' } }
    ]
  }

  const [totalItems, items] = await Promise.all([
    CadService.countDocuments(filter),
    CadService.find(filter).sort({ displayOrder: 1, updatedAt: -1 }).skip((safePage - 1) * maxLimit).limit(maxLimit).lean()
  ])

  return {
    services: items.map(serializeCadService),
    totalItems,
    page: safePage,
    limit: maxLimit,
    totalPages: totalItems ? Math.ceil(totalItems / maxLimit) : 0
  }
}

export const createCadServiceRecord = async (payload) => {
  const service = await CadService.create(payload)
  return serializeCadService(service)
}

export const updateCadServiceRecord = async (serviceId, updates) => {
  const service = await CadService.findByIdAndUpdate(serviceId, { $set: updates }, { new: true, runValidators: true }).lean()
  return service ? serializeCadService(service) : null
}

export const generateReferenceNumber = async () => {
  const year = new Date().getFullYear()
  const count = await CadServiceEnquiry.countDocuments({ referenceNumber: { $regex: `^CAD-${year}-` } })
  return `CAD-${year}-${String(count + 1).padStart(6, '0')}`
}

export const createCadServiceEnquiryRecord = async (payload) => {
  const enquiry = await CadServiceEnquiry.create(payload)
  return enquiry.toObject()
}

export const findEnquiryById = async (enquiryId) => {
  if (!mongoose.isValidObjectId(enquiryId)) return null
  return CadServiceEnquiry.findById(enquiryId).lean()
}

export const listEnquiriesForUser = async ({ userId, status = 'all', page = 1, limit = 20 } = {}) => {
  const safePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 20
  const maxLimit = Math.min(safeLimit, 50)
  const filter = { userId }
  if (status && status !== 'all') filter.status = status

  const [totalItems, items] = await Promise.all([
    CadServiceEnquiry.countDocuments(filter),
    CadServiceEnquiry.find(filter).sort({ updatedAt: -1 }).skip((safePage - 1) * maxLimit).limit(maxLimit).lean()
  ])

  return {
    enquiries: items,
    totalItems,
    page: safePage,
    limit: maxLimit,
    totalPages: totalItems ? Math.ceil(totalItems / maxLimit) : 0
  }
}

export const listEnquiriesForAdmin = async ({ status = 'all', page = 1, limit = 20 } = {}) => {
  const safePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1
  const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 20
  const maxLimit = Math.min(safeLimit, 50)
  const filter = {}
  if (status && status !== 'all') filter.status = status

  const [totalItems, items] = await Promise.all([
    CadServiceEnquiry.countDocuments(filter),
    CadServiceEnquiry.find(filter).sort({ updatedAt: -1 }).skip((safePage - 1) * maxLimit).limit(maxLimit).lean()
  ])

  return {
    enquiries: items,
    totalItems,
    page: safePage,
    limit: maxLimit,
    totalPages: totalItems ? Math.ceil(totalItems / maxLimit) : 0
  }
}

export const createCadServiceMessageRecord = async (payload) => {
  const message = await CadServiceMessage.create(payload)
  return message.toObject()
}

export const getEnquiryMessages = async (enquiryId) => {
  const messages = await CadServiceMessage.find({ enquiryId }).sort({ createdAt: 1 }).lean()
  return messages
}

export const createCadServiceQuotationRecord = async (payload) => {
  const quotation = await CadServiceQuotation.create(payload)
  return quotation.toObject()
}

export const updateCadServiceQuotationRecord = async (quotationId, updates) => {
  const quotation = await CadServiceQuotation.findByIdAndUpdate(quotationId, { $set: updates }, { new: true, runValidators: true }).lean()
  return quotation
}

export const findLatestQuotationForEnquiry = async (enquiryId) => {
  return CadServiceQuotation.findOne({ enquiryId }).sort({ version: -1, createdAt: -1 }).lean()
}

export const listQuotationsForEnquiry = async (enquiryId) => {
  return CadServiceQuotation.find({ enquiryId }).sort({ version: 1, createdAt: -1 }).lean()
}

export const getActiveQuotationForEnquiry = async (enquiryId) => {
  return CadServiceQuotation.findOne({ enquiryId, status: 'sent' }).sort({ version: -1, sentAt: -1 }).lean()
}

export default {
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
}
