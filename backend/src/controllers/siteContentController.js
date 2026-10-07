import asyncHandler from '../utils/asyncHandler.js'
import { sendSuccess, sendError } from '../utils/response.js'
import SiteSettings from '../models/SiteSettings.js'
import HomepageContent from '../models/HomepageContent.js'
import AboutContent from '../models/AboutContent.js'
import Testimonial from '../models/Testimonial.js'
import Faq from '../models/Faq.js'
import PortfolioProject from '../models/PortfolioProject.js'
import ContactEnquiry from '../models/ContactEnquiry.js'
import { buildSlugFromTitle, normalizeCmsListItem, normalizeCmsText } from '../utils/siteContent.js'
import { AppError } from '../utils/AppError.js'
import { uploadProfileImageFile, validateFounderImageUpload } from '../config/storage.js'

const defaultSettings = {
  businessName: 'CadTech Solution',
  brandName: 'CadTech Solution',
  tagline: 'Professional CAD models, engineering services, and practical training.',
  contactEmail: 'arvind@cadtechsolution.com',
  contactPhone: '+91 88399 89046',
  contactAddress: 'Bengaluru, India',
  primaryCtaLabel: 'Explore Courses',
  primaryCtaLink: '/courses',
  secondaryCtaLabel: 'Request a Quote',
  secondaryCtaLink: '/contact',
  metaTitle: 'CadTech Solution | CAD Training and Design Services',
  metaDescription: 'Learn CAD, access engineering resources, and request professional design support.',
  socialLinks: {
    facebook: 'https://www.facebook.com/cadtech2/',
    linkedin: '',
    instagram: 'https://www.instagram.com/cad__tech/?hl=en',
    youtube: 'https://www.youtube.com/channel/UCKpzCS-vY2BO9QjTPFSmsuA'
  }
}

const formatSettings = (settings = null) => {
  const value = settings && typeof settings === 'object' ? settings : {}
  return {
    ...defaultSettings,
    ...value,
    founderImageUrl: normalizeCmsText(value.founderImageUrl, ''),
    socialLinks: {
      ...defaultSettings.socialLinks,
      ...(value.socialLinks || {}),
      instagram: normalizeCmsText(value.socialLinks?.instagram, defaultSettings.socialLinks.instagram),
      youtube: normalizeCmsText(value.socialLinks?.youtube, defaultSettings.socialLinks.youtube)
    }
  }
}

const sanitizeSocialLinks = (socialLinks = {}) => ({
  facebook: normalizeCmsText(socialLinks.facebook, ''),
  linkedin: normalizeCmsText(socialLinks.linkedin, ''),
  instagram: normalizeCmsText(socialLinks.instagram, ''),
  youtube: normalizeCmsText(socialLinks.youtube, '')
})

const containsNoSqlOperator = (value) => {
  if (!value || typeof value !== 'object') return false
  return Object.keys(value).some((key) => key.startsWith('$'))
}

const sanitizePublicText = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback
  return value.replace(/[\u0000-\u001F\u007F]+/g, '').trim() || fallback
}

const isAllowedUrl = (value) => {
  if (typeof value !== 'string') return false
  const next = value.trim()
  if (!next) return true
  try {
    const url = new URL(next)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const sortByDisplayOrder = (items = []) => [...items].sort((left, right) => Number(left.displayOrder || 0) - Number(right.displayOrder || 0))

const generateReferenceNumber = async () => {
  const now = new Date()
  const year = now.getFullYear()
  const sequence = Math.floor(Math.random() * 900000) + 100000
  const prefix = `CNT-${year}-${sequence}`
  const existing = await ContactEnquiry.findOne({ referenceNumber: prefix }).lean()
  return existing ? generateReferenceNumber() : prefix
}

export const getPublicSiteSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.findOne({ isActive: true }).sort({ updatedAt: -1 }).lean()
  return sendSuccess(res, { settings: formatSettings(settings) }, 'Site settings retrieved successfully.')
})

export const getPublicHomepageContent = asyncHandler(async (req, res) => {
  const homepage = await HomepageContent.findOne({ isPublished: true }).sort({ displayOrder: 1, updatedAt: -1 }).lean()
  return sendSuccess(res, {
    homepage: homepage || {
      heroTitle: 'Learn CAD. Design with confidence.',
      heroSubtitle: 'Practical engineering training, CAD models, and expert support for students and businesses.',
      heroPrimaryCtaLabel: 'Explore Courses',
      heroPrimaryCtaLink: '/courses',
      heroSecondaryCtaLabel: 'Contact Us',
      heroSecondaryCtaLink: '/contact',
      stats: ['2000+ learners', '40+ CAD courses', '15+ design categories'],
      featureHighlights: ['Structured Learning', 'Industry-specific CAD guidance', 'Project-focused support']
    }
  }, 'Homepage content retrieved successfully.')
})

export const getPublicAboutContent = asyncHandler(async (req, res) => {
  const about = await AboutContent.findOne({ isPublished: true }).sort({ displayOrder: 1, updatedAt: -1 }).lean()
  return sendSuccess(res, {
    about: about || {
      pageTitle: 'About CadTech Solution',
      intro: 'CadTech Solution brings together practical CAD training, organized design resources, and engineering services.',
      mission: 'Make professional CAD knowledge and engineering support easier to access for learners and businesses.',
      vision: 'Build a practical digital platform where engineering education and design resources work together.',
      supportAreas: ['CAD models', 'engineering services', 'professional training'],
      values: ['Practical learning', 'Accessible resources', 'Quality design'],
      finalCta: 'Ready to start your CAD journey?'
    }
  }, 'About content retrieved successfully.')
})

export const getPublicTestimonials = asyncHandler(async (req, res) => {
  const testimonials = sortByDisplayOrder(await Testimonial.find({ isPublished: true }).sort({ displayOrder: 1, createdAt: -1 }).lean())
  return sendSuccess(res, { testimonials }, 'Testimonials retrieved successfully.')
})

export const getPublicFaqs = asyncHandler(async (req, res) => {
  const faqs = sortByDisplayOrder(await Faq.find({ isPublished: true }).sort({ displayOrder: 1, createdAt: -1 }).lean())
  return sendSuccess(res, { faqs }, 'FAQs retrieved successfully.')
})

export const getPublicPortfolio = asyncHandler(async (req, res) => {
  const projects = sortByDisplayOrder(await PortfolioProject.find({ isPublished: true }).sort({ displayOrder: 1, createdAt: -1 }).lean())
  return sendSuccess(res, { projects }, 'Portfolio projects retrieved successfully.')
})

export const submitContactEnquiry = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  if (containsNoSqlOperator(payload)) {
    return sendError(res, 'Invalid submission payload.', 400)
  }

  const name = sanitizePublicText(payload.name, '')
  const email = sanitizePublicText(payload.email, '').toLowerCase()
  const subject = sanitizePublicText(payload.subject, '')
  const message = sanitizePublicText(payload.message, '')
  const honeypot = sanitizePublicText(payload.honeypot || payload.website || '', '')
  const phone = sanitizePublicText(payload.phone || payload.phoneNumber || '', '')

  if (honeypot) return sendError(res, 'Submission rejected.', 400)
  if (!name || name.length < 2) return sendError(res, 'Your name is required.', 400)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 'A valid email address is required.', 400)
  if (!subject || subject.length < 5) return sendError(res, 'Please provide a clear subject.', 400)
  if (!message || message.length < 20) return sendError(res, 'Please share at least 20 characters of detail.', 400)

  const enquiry = await ContactEnquiry.create({
    referenceNumber: await generateReferenceNumber(),
    name,
    email,
    phone: phone || null,
    inquiryType: sanitizePublicText(payload.inquiryType, 'general'),
    serviceSlug: sanitizePublicText(payload.serviceSlug, ''),
    courseSlug: sanitizePublicText(payload.courseSlug, ''),
    subject,
    message,
    sourcePage: sanitizePublicText(payload.sourcePage || payload.source || 'website', 'website'),
    source: 'website',
    honeypot
  })

  return sendSuccess(res, { enquiry: { ...enquiry.toObject(), adminNotes: undefined } }, 'Thank you. Your message has been received.', 201)
})

export const listAdminSiteSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.findOne({}).sort({ updatedAt: -1 }).lean()
  return sendSuccess(res, { settings: formatSettings(settings) }, 'Site settings retrieved successfully.')
})

export const upsertAdminSiteSettings = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const updates = {
    businessName: normalizeCmsText(payload.businessName, defaultSettings.businessName),
    brandName: normalizeCmsText(payload.brandName, defaultSettings.brandName),
    tagline: normalizeCmsText(payload.tagline, defaultSettings.tagline),
    contactEmail: normalizeCmsText(payload.contactEmail, defaultSettings.contactEmail),
    contactPhone: normalizeCmsText(payload.contactPhone, defaultSettings.contactPhone),
    contactAddress: normalizeCmsText(payload.contactAddress, defaultSettings.contactAddress),
    primaryCtaLabel: normalizeCmsText(payload.primaryCtaLabel, defaultSettings.primaryCtaLabel),
    primaryCtaLink: normalizeCmsText(payload.primaryCtaLink, defaultSettings.primaryCtaLink),
    secondaryCtaLabel: normalizeCmsText(payload.secondaryCtaLabel, defaultSettings.secondaryCtaLabel),
    secondaryCtaLink: normalizeCmsText(payload.secondaryCtaLink, defaultSettings.secondaryCtaLink),
    metaTitle: normalizeCmsText(payload.metaTitle, defaultSettings.metaTitle),
    metaDescription: normalizeCmsText(payload.metaDescription, defaultSettings.metaDescription),
    heroImageUrl: normalizeCmsText(payload.heroImageUrl, ''),
    founderImageUrl: normalizeCmsText(payload.founderImageUrl, ''),
    socialLinks: sanitizeSocialLinks(payload.socialLinks || {}),
    isActive: payload.isActive !== false
  }

  const settings = await SiteSettings.findOneAndUpdate({}, updates, { upsert: true, new: true, setDefaultsOnInsert: true }).lean()
  return sendSuccess(res, { settings: formatSettings(settings) }, 'Site settings updated successfully.')
})

export const uploadFounderImage = asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, 'No founder image was provided.', 400)
  validateFounderImageUpload({
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size
  })
  const image = await uploadProfileImageFile({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype
  })
  if (!image.url) throw new AppError('Cloudinary did not return an image URL.', 503)

  const settings = await SiteSettings.findOneAndUpdate({}, { founderImageUrl: image.url }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean()
  return sendSuccess(res, { image, settings: formatSettings(settings) }, 'Founder image uploaded successfully.')
})

export const listAdminHomepageContent = asyncHandler(async (req, res) => {
  const items = sortByDisplayOrder(await HomepageContent.find({}).sort({ displayOrder: 1, createdAt: -1 }).lean())
  return sendSuccess(res, { items }, 'Homepage content retrieved successfully.')
})

export const createAdminHomepageContent = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const item = await HomepageContent.create({
    heroTitle: normalizeCmsText(payload.heroTitle, 'Learn CAD. Design with confidence.'),
    heroSubtitle: normalizeCmsText(payload.heroSubtitle, 'Practical engineering training, CAD models, and expert support for students and businesses.'),
    heroPrimaryCtaLabel: normalizeCmsText(payload.heroPrimaryCtaLabel, 'Explore Courses'),
    heroPrimaryCtaLink: normalizeCmsText(payload.heroPrimaryCtaLink, '/courses'),
    heroSecondaryCtaLabel: normalizeCmsText(payload.heroSecondaryCtaLabel, 'Contact Us'),
    heroSecondaryCtaLink: normalizeCmsText(payload.heroSecondaryCtaLink, '/contact'),
    stats: normalizeCmsListItem(payload.stats, 12),
    featureHighlights: normalizeCmsListItem(payload.featureHighlights, 12),
    isPublished: payload.isPublished !== false,
    displayOrder: Number(payload.displayOrder || 0)
  })
  return sendSuccess(res, { item }, 'Homepage content created successfully.', 201)
})

export const updateAdminHomepageContent = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const item = await HomepageContent.findByIdAndUpdate(req.params.itemId, {
    heroTitle: normalizeCmsText(payload.heroTitle, 'Learn CAD. Design with confidence.'),
    heroSubtitle: normalizeCmsText(payload.heroSubtitle, 'Practical engineering training, CAD models, and expert support for students and businesses.'),
    heroPrimaryCtaLabel: normalizeCmsText(payload.heroPrimaryCtaLabel, 'Explore Courses'),
    heroPrimaryCtaLink: normalizeCmsText(payload.heroPrimaryCtaLink, '/courses'),
    heroSecondaryCtaLabel: normalizeCmsText(payload.heroSecondaryCtaLabel, 'Contact Us'),
    heroSecondaryCtaLink: normalizeCmsText(payload.heroSecondaryCtaLink, '/contact'),
    stats: normalizeCmsListItem(payload.stats, 12),
    featureHighlights: normalizeCmsListItem(payload.featureHighlights, 12),
    isPublished: payload.isPublished !== false,
    displayOrder: Number(payload.displayOrder || 0)
  }, { new: true })

  if (!item) return sendError(res, 'Homepage content not found.', 404)
  return sendSuccess(res, { item }, 'Homepage content updated successfully.')
})

export const deleteAdminHomepageContent = asyncHandler(async (req, res) => {
  const item = await HomepageContent.findByIdAndDelete(req.params.itemId)
  if (!item) return sendError(res, 'Homepage content not found.', 404)
  return sendSuccess(res, { id: req.params.itemId }, 'Homepage content deleted successfully.')
})

export const listAdminAboutContent = asyncHandler(async (req, res) => {
  const items = sortByDisplayOrder(await AboutContent.find({}).sort({ displayOrder: 1, createdAt: -1 }).lean())
  return sendSuccess(res, { items }, 'About content retrieved successfully.')
})

export const createAdminAboutContent = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const item = await AboutContent.create({
    pageTitle: normalizeCmsText(payload.pageTitle, 'About CadTech Solution'),
    intro: normalizeCmsText(payload.intro, 'CadTech Solution brings together practical CAD training, organized design resources, and engineering services.'),
    mission: normalizeCmsText(payload.mission, 'Make professional CAD knowledge and engineering support easier to access for learners and businesses.'),
    vision: normalizeCmsText(payload.vision, 'Build a practical digital platform where engineering education and design resources work together.'),
    supportAreas: normalizeCmsListItem(payload.supportAreas, 10),
    values: normalizeCmsListItem(payload.values, 10),
    finalCta: normalizeCmsText(payload.finalCta, 'Ready to start your CAD journey?'),
    isPublished: payload.isPublished !== false,
    displayOrder: Number(payload.displayOrder || 0)
  })
  return sendSuccess(res, { item }, 'About content created successfully.', 201)
})

export const updateAdminAboutContent = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const item = await AboutContent.findByIdAndUpdate(req.params.itemId, {
    pageTitle: normalizeCmsText(payload.pageTitle, 'About CadTech Solution'),
    intro: normalizeCmsText(payload.intro, 'CadTech Solution brings together practical CAD training, organized design resources, and engineering services.'),
    mission: normalizeCmsText(payload.mission, 'Make professional CAD knowledge and engineering support easier to access for learners and businesses.'),
    vision: normalizeCmsText(payload.vision, 'Build a practical digital platform where engineering education and design resources work together.'),
    supportAreas: normalizeCmsListItem(payload.supportAreas, 10),
    values: normalizeCmsListItem(payload.values, 10),
    finalCta: normalizeCmsText(payload.finalCta, 'Ready to start your CAD journey?'),
    isPublished: payload.isPublished !== false,
    displayOrder: Number(payload.displayOrder || 0)
  }, { new: true })

  if (!item) return sendError(res, 'About content not found.', 404)
  return sendSuccess(res, { item }, 'About content updated successfully.')
})

export const deleteAdminAboutContent = asyncHandler(async (req, res) => {
  const item = await AboutContent.findByIdAndDelete(req.params.itemId)
  if (!item) return sendError(res, 'About content not found.', 404)
  return sendSuccess(res, { id: req.params.itemId }, 'About content deleted successfully.')
})

export const listAdminTestimonials = asyncHandler(async (req, res) => {
  const items = sortByDisplayOrder(await Testimonial.find({}).sort({ displayOrder: 1, createdAt: -1 }).lean())
  return sendSuccess(res, { items }, 'Testimonials retrieved successfully.')
})

export const createAdminTestimonial = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const item = await Testimonial.create({
    name: normalizeCmsText(payload.name, 'Learner'),
    role: normalizeCmsText(payload.role, 'Student'),
    company: normalizeCmsText(payload.company, ''),
    quote: normalizeCmsText(payload.quote, 'Great experience.'),
    initials: normalizeCmsText(payload.initials, 'LT'),
    isPublished: payload.isPublished !== false,
    displayOrder: Number(payload.displayOrder || 0)
  })
  return sendSuccess(res, { item }, 'Testimonial created successfully.', 201)
})

export const updateAdminTestimonial = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const item = await Testimonial.findByIdAndUpdate(req.params.itemId, {
    name: normalizeCmsText(payload.name, 'Learner'),
    role: normalizeCmsText(payload.role, 'Student'),
    company: normalizeCmsText(payload.company, ''),
    quote: normalizeCmsText(payload.quote, 'Great experience.'),
    initials: normalizeCmsText(payload.initials, 'LT'),
    isPublished: payload.isPublished !== false,
    displayOrder: Number(payload.displayOrder || 0)
  }, { new: true })

  if (!item) return sendError(res, 'Testimonial not found.', 404)
  return sendSuccess(res, { item }, 'Testimonial updated successfully.')
})

export const deleteAdminTestimonial = asyncHandler(async (req, res) => {
  const item = await Testimonial.findByIdAndDelete(req.params.itemId)
  if (!item) return sendError(res, 'Testimonial not found.', 404)
  return sendSuccess(res, { id: req.params.itemId }, 'Testimonial deleted successfully.')
})

export const listAdminFaqs = asyncHandler(async (req, res) => {
  const items = sortByDisplayOrder(await Faq.find({}).sort({ displayOrder: 1, createdAt: -1 }).lean())
  return sendSuccess(res, { items }, 'FAQs retrieved successfully.')
})

export const createAdminFaq = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const item = await Faq.create({
    question: normalizeCmsText(payload.question, 'Question'),
    answer: normalizeCmsText(payload.answer, 'Answer'),
    category: normalizeCmsText(payload.category, 'general'),
    isPublished: payload.isPublished !== false,
    displayOrder: Number(payload.displayOrder || 0)
  })
  return sendSuccess(res, { item }, 'FAQ created successfully.', 201)
})

export const updateAdminFaq = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const item = await Faq.findByIdAndUpdate(req.params.itemId, {
    question: normalizeCmsText(payload.question, 'Question'),
    answer: normalizeCmsText(payload.answer, 'Answer'),
    category: normalizeCmsText(payload.category, 'general'),
    isPublished: payload.isPublished !== false,
    displayOrder: Number(payload.displayOrder || 0)
  }, { new: true })

  if (!item) return sendError(res, 'FAQ not found.', 404)
  return sendSuccess(res, { item }, 'FAQ updated successfully.')
})

export const deleteAdminFaq = asyncHandler(async (req, res) => {
  const item = await Faq.findByIdAndDelete(req.params.itemId)
  if (!item) return sendError(res, 'FAQ not found.', 404)
  return sendSuccess(res, { id: req.params.itemId }, 'FAQ deleted successfully.')
})

export const listAdminPortfolio = asyncHandler(async (req, res) => {
  const items = sortByDisplayOrder(await PortfolioProject.find({}).sort({ displayOrder: 1, createdAt: -1 }).lean())
  return sendSuccess(res, { items }, 'Portfolio projects retrieved successfully.')
})

export const createAdminPortfolioProject = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const title = normalizeCmsText(payload.title, 'Project')
  const slug = normalizeCmsText(payload.slug, buildSlugFromTitle(title))
  const item = await PortfolioProject.create({
    title,
    slug,
    category: normalizeCmsText(payload.category, 'General'),
    summary: normalizeCmsText(payload.summary, ''),
    description: normalizeCmsText(payload.description, ''),
    imageUrl: normalizeCmsText(payload.imageUrl, ''),
    projectUrl: normalizeCmsText(payload.projectUrl, ''),
    technologies: normalizeCmsListItem(payload.technologies, 12),
    isPublished: payload.isPublished !== false,
    displayOrder: Number(payload.displayOrder || 0)
  })
  return sendSuccess(res, { item }, 'Portfolio project created successfully.', 201)
})

export const updateAdminPortfolioProject = asyncHandler(async (req, res) => {
  const payload = req.body || {}
  const title = normalizeCmsText(payload.title, 'Project')
  const slug = normalizeCmsText(payload.slug, buildSlugFromTitle(title))
  const item = await PortfolioProject.findByIdAndUpdate(req.params.itemId, {
    title,
    slug,
    category: normalizeCmsText(payload.category, 'General'),
    summary: normalizeCmsText(payload.summary, ''),
    description: normalizeCmsText(payload.description, ''),
    imageUrl: normalizeCmsText(payload.imageUrl, ''),
    projectUrl: normalizeCmsText(payload.projectUrl, ''),
    technologies: normalizeCmsListItem(payload.technologies, 12),
    isPublished: payload.isPublished !== false,
    displayOrder: Number(payload.displayOrder || 0)
  }, { new: true })

  if (!item) return sendError(res, 'Portfolio project not found.', 404)
  return sendSuccess(res, { item }, 'Portfolio project updated successfully.')
})

export const deleteAdminPortfolioProject = asyncHandler(async (req, res) => {
  const item = await PortfolioProject.findByIdAndDelete(req.params.itemId)
  if (!item) return sendError(res, 'Portfolio project not found.', 404)
  return sendSuccess(res, { id: req.params.itemId }, 'Portfolio project deleted successfully.')
})

export const getAdminCmsSummary = asyncHandler(async (req, res) => {
  const [homepageCount, aboutCount, testimonialsCount, faqCount, portfolioCount, contactCount] = await Promise.all([
    HomepageContent.countDocuments({}),
    AboutContent.countDocuments({}),
    Testimonial.countDocuments({ isPublished: true }),
    Faq.countDocuments({ isPublished: true }),
    PortfolioProject.countDocuments({ isPublished: true }),
    ContactEnquiry.countDocuments({ status: 'new' })
  ])

  return sendSuccess(res, {
    homepageCount,
    aboutCount,
    testimonialsCount,
    faqCount,
    portfolioCount,
    newContactEnquiries: contactCount
  }, 'CMS summary retrieved successfully.')
})

export const listAdminContactEnquiries = asyncHandler(async (req, res) => {
  const enquiries = await ContactEnquiry.find({}).sort({ createdAt: -1 }).lean()
  return sendSuccess(res, { enquiries }, 'Contact enquiries retrieved successfully.')
})

export const getAdminContactEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await ContactEnquiry.findById(req.params.enquiryId).lean()
  if (!enquiry) return sendError(res, 'Contact enquiry not found.', 404)
  return sendSuccess(res, { enquiry }, 'Contact enquiry retrieved successfully.')
})

export const updateAdminContactEnquiryStatus = asyncHandler(async (req, res) => {
  const status = normalizeCmsText(req.body?.status, 'new')
  const allowed = ['new', 'in_review', 'responded', 'closed', 'spam']
  const enquiry = await ContactEnquiry.findByIdAndUpdate(req.params.enquiryId, {
    status: allowed.includes(status) ? status : 'new',
    isRead: true
  }, { new: true })

  if (!enquiry) return sendError(res, 'Contact enquiry not found.', 404)
  return sendSuccess(res, { enquiry }, 'Contact enquiry status updated successfully.')
})

export const assignAdminContactEnquiry = asyncHandler(async (req, res) => {
  const assignmentId = sanitizePublicText(req.body?.assigneeId || '', '')
  const enquiry = await ContactEnquiry.findByIdAndUpdate(req.params.enquiryId, {
    assignedAdminId: assignmentId || null,
    isRead: true
  }, { new: true })

  if (!enquiry) return sendError(res, 'Contact enquiry not found.', 404)
  return sendSuccess(res, { enquiry }, 'Contact enquiry assignment updated successfully.')
})

export const updateAdminContactEnquiryNotes = asyncHandler(async (req, res) => {
  const notes = sanitizePublicText(req.body?.notes || '', '')
  const enquiry = await ContactEnquiry.findByIdAndUpdate(req.params.enquiryId, {
    adminNotes: notes,
    isRead: true
  }, { new: true })

  if (!enquiry) return sendError(res, 'Contact enquiry not found.', 404)
  return sendSuccess(res, { enquiry }, 'Contact enquiry notes updated successfully.')
})

export default {
  getPublicSiteSettings,
  getPublicHomepageContent,
  getPublicAboutContent,
  getPublicTestimonials,
  getPublicFaqs,
  getPublicPortfolio,
  submitContactEnquiry,
  listAdminSiteSettings,
  upsertAdminSiteSettings,
  listAdminHomepageContent,
  createAdminHomepageContent,
  updateAdminHomepageContent,
  deleteAdminHomepageContent,
  listAdminAboutContent,
  createAdminAboutContent,
  updateAdminAboutContent,
  deleteAdminAboutContent,
  listAdminTestimonials,
  createAdminTestimonial,
  updateAdminTestimonial,
  deleteAdminTestimonial,
  listAdminFaqs,
  createAdminFaq,
  updateAdminFaq,
  deleteAdminFaq,
  listAdminPortfolio,
  createAdminPortfolioProject,
  updateAdminPortfolioProject,
  deleteAdminPortfolioProject,
  getAdminCmsSummary,
  listAdminContactEnquiries,
  getAdminContactEnquiry,
  updateAdminContactEnquiryStatus,
  assignAdminContactEnquiry,
  updateAdminContactEnquiryNotes
}
