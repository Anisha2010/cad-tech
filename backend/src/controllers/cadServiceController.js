import mongoose from 'mongoose'
import asyncHandler from '../utils/asyncHandler.js'
import { sendError, sendSuccess } from '../utils/response.js'
import * as cadServiceService from '../services/cadServiceService.js'

export const listPublicCadServices = asyncHandler(async (req, res) => {
  const result = await cadServiceService.getPublicCadServices({
    search: typeof req.query.search === 'string' ? req.query.search : '',
    category: typeof req.query.category === 'string' ? req.query.category : '',
    software: typeof req.query.software === 'string' ? req.query.software : ''
  })

  return sendSuccess(res, {
    services: result.services,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalItems: result.totalItems,
      totalPages: result.totalPages
    }
  }, 'CAD services retrieved successfully.')
})

export const getPublicCadServiceBySlug = asyncHandler(async (req, res) => {
  const service = await cadServiceService.getCadServiceBySlug(req.params.slug)
  if (!service) return sendError(res, 'CAD service not found.', 404)
  return sendSuccess(res, { service }, 'CAD service retrieved successfully.')
})

export const listAdminCadServices = asyncHandler(async (req, res) => {
  const result = await cadServiceService.listAdminCadServices({
    search: typeof req.query.search === 'string' ? req.query.search : '',
    status: typeof req.query.status === 'string' ? req.query.status : 'all',
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20)
  })

  return sendSuccess(res, {
    services: result.services,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalItems: result.totalItems,
      totalPages: result.totalPages
    }
  }, 'Admin CAD services retrieved successfully.')
})

export const createAdminCadService = asyncHandler(async (req, res) => {
  const service = await cadServiceService.createCadService({ userId: req.user.id, payload: req.body })
  return sendSuccess(res, { service }, 'CAD service created successfully.', 201)
})

export const getAdminCadServiceDetails = asyncHandler(async (req, res) => {
  const service = await cadServiceService.getAdminCadService(req.params.serviceId)
  if (!service) return sendError(res, 'CAD service not found.', 404)
  return sendSuccess(res, { service }, 'CAD service retrieved successfully.')
})

export const updateAdminCadService = asyncHandler(async (req, res) => {
  const service = await cadServiceService.updateCadService({ serviceId: req.params.serviceId, userId: req.user.id, payload: req.body })
  if (!service) return sendError(res, 'CAD service not found.', 404)
  return sendSuccess(res, { service }, 'CAD service updated successfully.')
})

export const updateAdminCadServiceStatus = asyncHandler(async (req, res) => {
  const service = await cadServiceService.updateCadServiceStatus({ serviceId: req.params.serviceId, userId: req.user.id, status: req.body.status })
  if (!service) return sendError(res, 'CAD service not found.', 404)
  return sendSuccess(res, { service }, 'CAD service status updated successfully.')
})

export const createStudentCadServiceEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await cadServiceService.createCadServiceEnquiry({ userId: req.user.id, payload: req.body })
  return sendSuccess(res, { enquiry }, 'Service enquiry submitted successfully.', 201)
})

export const listStudentCadServiceEnquiries = asyncHandler(async (req, res) => {
  const { status = 'all', page = 1, limit = 20 } = req.query
  const result = await cadServiceService.listStudentEnquiries({ userId: req.user.id, status: typeof status === 'string' ? status : 'all', page: Number(page || 1), limit: Number(limit || 20) })

  return sendSuccess(res, {
    enquiries: result.enquiries,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalItems: result.totalItems,
      totalPages: result.totalPages
    }
  }, 'Student service enquiries retrieved successfully.')
})

export const getStudentCadServiceEnquiry = asyncHandler(async (req, res) => {
  const result = await cadServiceService.getStudentEnquiry({ userId: req.user.id, enquiryId: req.params.enquiryId })
  if (!result) return sendError(res, 'Service enquiry not found.', 404)
  return sendSuccess(res, result, 'Service enquiry retrieved successfully.')
})

export const addStudentCadServiceMessage = asyncHandler(async (req, res) => {
  const message = await cadServiceService.addEnquiryMessage({ userId: req.user.id, enquiryId: req.params.enquiryId, messageText: req.body.message })
  if (!message) return sendError(res, 'Service enquiry not found.', 404)
  return sendSuccess(res, { message }, 'Message sent successfully.')
})

export const acceptStudentCadServiceQuotation = asyncHandler(async (req, res) => {
  const result = await cadServiceService.acceptQuotedEnquiry({ userId: req.user.id, enquiryId: req.params.enquiryId })
  if (!result) return sendError(res, 'Service enquiry not found.', 404)
  return sendSuccess(res, result, 'Quotation accepted. The CadTech team will contact you with the next steps.')
})

export const declineStudentCadServiceQuotation = asyncHandler(async (req, res) => {
  const result = await cadServiceService.declineQuotedEnquiry({ userId: req.user.id, enquiryId: req.params.enquiryId, reason: req.body.reason })
  if (!result) return sendError(res, 'Service enquiry not found.', 404)
  return sendSuccess(res, result, 'Quotation declined successfully.')
})

export const cancelStudentCadServiceEnquiry = asyncHandler(async (req, res) => {
  const result = await cadServiceService.cancelEnquiry({ userId: req.user.id, enquiryId: req.params.enquiryId })
  if (!result) return sendError(res, 'Service enquiry not found.', 404)
  return sendSuccess(res, result, 'Service enquiry cancelled.')
})

export const listAdminCadServiceEnquiries = asyncHandler(async (req, res) => {
  const result = await cadServiceService.listAdminEnquiries({
    status: typeof req.query.status === 'string' ? req.query.status : 'all',
    search: typeof req.query.search === 'string' ? req.query.search : '',
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20)
  })

  return sendSuccess(res, {
    enquiries: result.enquiries,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalItems: result.totalItems,
      totalPages: result.totalPages
    }
  }, 'Admin service enquiries retrieved successfully.')
})

export const getAdminCadServiceEnquiry = asyncHandler(async (req, res) => {
  const result = await cadServiceService.getAdminEnquiry(req.params.enquiryId)
  if (!result) return sendError(res, 'Service enquiry not found.', 404)
  return sendSuccess(res, result, 'Service enquiry retrieved successfully.')
})

export const updateAdminCadServiceEnquiryStatus = asyncHandler(async (req, res) => {
  const enquiry = await cadServiceService.updateEnquiryStatus({ adminUserId: req.user.id, enquiryId: req.params.enquiryId, status: req.body.status })
  if (!enquiry) return sendError(res, 'Service enquiry not found.', 404)
  return sendSuccess(res, { enquiry }, 'Service enquiry status updated successfully.')
})

export const assignAdminCadServiceEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await cadServiceService.assignEnquiry({ adminUserId: req.user.id, enquiryId: req.params.enquiryId, assigneeId: req.body.assigneeId || null })
  if (!enquiry) return sendError(res, 'Service enquiry not found.', 404)
  return sendSuccess(res, { enquiry }, 'Service enquiry assignment updated successfully.')
})

export const addAdminCadServiceMessage = asyncHandler(async (req, res) => {
  const message = await cadServiceService.addAdminMessage({ adminUserId: req.user.id, enquiryId: req.params.enquiryId, messageText: req.body.message })
  if (!message) return sendError(res, 'Service enquiry not found.', 404)
  return sendSuccess(res, { message }, 'Admin message added successfully.')
})

export const createAdminCadServiceQuotation = asyncHandler(async (req, res) => {
  const quotation = await cadServiceService.createQuotation({ adminUserId: req.user.id, enquiryId: req.params.enquiryId, payload: req.body })
  if (!quotation) return sendError(res, 'Service enquiry not found.', 404)
  return sendSuccess(res, { quotation }, 'Service quotation draft created successfully.', 201)
})

export const sendAdminCadServiceQuotation = asyncHandler(async (req, res) => {
  const quotation = await cadServiceService.sendQuotation({ adminUserId: req.user.id, enquiryId: req.params.enquiryId, quotationId: req.params.quotationId })
  if (!quotation) return sendError(res, 'Service quotation not found.', 404)
  return sendSuccess(res, { quotation }, 'Service quotation sent successfully.')
})

export default {
  listPublicCadServices,
  getPublicCadServiceBySlug,
  listAdminCadServices,
  createAdminCadService,
  getAdminCadServiceDetails,
  updateAdminCadService,
  updateAdminCadServiceStatus,
  createStudentCadServiceEnquiry,
  listStudentCadServiceEnquiries,
  getStudentCadServiceEnquiry,
  addStudentCadServiceMessage,
  acceptStudentCadServiceQuotation,
  declineStudentCadServiceQuotation,
  cancelStudentCadServiceEnquiry,
  listAdminCadServiceEnquiries,
  getAdminCadServiceEnquiry,
  updateAdminCadServiceEnquiryStatus,
  assignAdminCadServiceEnquiry,
  addAdminCadServiceMessage,
  createAdminCadServiceQuotation,
  sendAdminCadServiceQuotation
}
