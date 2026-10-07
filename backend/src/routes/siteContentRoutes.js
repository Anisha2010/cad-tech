import express from 'express'
import multer from 'multer'
import { requireAuthentication } from '../middleware/authentication.js'
import { allowRoles } from '../middleware/authorization.js'
import {
  getPublicSiteSettings,
  getPublicHomepageContent,
  getPublicAboutContent,
  getPublicTestimonials,
  getPublicFaqs,
  getPublicPortfolio,
  submitContactEnquiry,
  getAdminCmsSummary,
  listAdminSiteSettings,
  upsertAdminSiteSettings,
  uploadFounderImage,
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
  listAdminContactEnquiries,
  getAdminContactEnquiry,
  updateAdminContactEnquiryStatus,
  assignAdminContactEnquiry,
  updateAdminContactEnquiryNotes
} from '../controllers/siteContentController.js'

const router = express.Router()
const founderImageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } })

router.get('/site-settings', getPublicSiteSettings)
router.get('/homepage', getPublicHomepageContent)
router.get('/about', getPublicAboutContent)
router.get('/testimonials', getPublicTestimonials)
router.get('/faqs', getPublicFaqs)
router.get('/portfolio', getPublicPortfolio)
router.post('/contact', submitContactEnquiry)
router.post('/public/contact-enquiries', submitContactEnquiry)

router.get('/admin/cms/summary', requireAuthentication, allowRoles('admin'), getAdminCmsSummary)
router.get('/admin/site-settings', requireAuthentication, allowRoles('admin'), listAdminSiteSettings)
router.post('/admin/site-settings', requireAuthentication, allowRoles('admin'), upsertAdminSiteSettings)
router.post('/admin/site-settings/founder-image', requireAuthentication, allowRoles('admin'), founderImageUpload.single('file'), uploadFounderImage)

router.get('/admin/homepage', requireAuthentication, allowRoles('admin'), listAdminHomepageContent)
router.post('/admin/homepage', requireAuthentication, allowRoles('admin'), createAdminHomepageContent)
router.patch('/admin/homepage/:itemId', requireAuthentication, allowRoles('admin'), updateAdminHomepageContent)
router.delete('/admin/homepage/:itemId', requireAuthentication, allowRoles('admin'), deleteAdminHomepageContent)

router.get('/admin/about', requireAuthentication, allowRoles('admin'), listAdminAboutContent)
router.post('/admin/about', requireAuthentication, allowRoles('admin'), createAdminAboutContent)
router.patch('/admin/about/:itemId', requireAuthentication, allowRoles('admin'), updateAdminAboutContent)
router.delete('/admin/about/:itemId', requireAuthentication, allowRoles('admin'), deleteAdminAboutContent)

router.get('/admin/testimonials', requireAuthentication, allowRoles('admin'), listAdminTestimonials)
router.post('/admin/testimonials', requireAuthentication, allowRoles('admin'), createAdminTestimonial)
router.patch('/admin/testimonials/:itemId', requireAuthentication, allowRoles('admin'), updateAdminTestimonial)
router.delete('/admin/testimonials/:itemId', requireAuthentication, allowRoles('admin'), deleteAdminTestimonial)

router.get('/admin/faqs', requireAuthentication, allowRoles('admin'), listAdminFaqs)
router.post('/admin/faqs', requireAuthentication, allowRoles('admin'), createAdminFaq)
router.patch('/admin/faqs/:itemId', requireAuthentication, allowRoles('admin'), updateAdminFaq)
router.delete('/admin/faqs/:itemId', requireAuthentication, allowRoles('admin'), deleteAdminFaq)

router.get('/admin/portfolio', requireAuthentication, allowRoles('admin'), listAdminPortfolio)
router.post('/admin/portfolio', requireAuthentication, allowRoles('admin'), createAdminPortfolioProject)
router.patch('/admin/portfolio/:itemId', requireAuthentication, allowRoles('admin'), updateAdminPortfolioProject)
router.delete('/admin/portfolio/:itemId', requireAuthentication, allowRoles('admin'), deleteAdminPortfolioProject)

router.get('/admin/contact-enquiries', requireAuthentication, allowRoles('admin'), listAdminContactEnquiries)
router.get('/admin/contact-enquiries/:enquiryId', requireAuthentication, allowRoles('admin'), getAdminContactEnquiry)
router.patch('/admin/contact-enquiries/:enquiryId/status', requireAuthentication, allowRoles('admin'), updateAdminContactEnquiryStatus)
router.patch('/admin/contact-enquiries/:enquiryId/assignment', requireAuthentication, allowRoles('admin'), assignAdminContactEnquiry)
router.patch('/admin/contact-enquiries/:enquiryId/notes', requireAuthentication, allowRoles('admin'), updateAdminContactEnquiryNotes)

export default router
