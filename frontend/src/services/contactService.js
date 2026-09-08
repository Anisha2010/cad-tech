import axios from 'axios'
import apiBaseUrl from '../config/api.js'

async function submitContactInquiry(formData) {
  const baseUrl = apiBaseUrl
  if (!baseUrl) return { configured: false }

  const payload = {
    name: formData.name.trim(),
    email: formData.email.trim(),
    phone: formData.phone.trim() || null,
    inquiryType: formData.inquiryType,
    serviceSlug: formData.inquiryType === 'service' ? formData.serviceSlug || null : null,
    courseSlug: formData.inquiryType === 'course' ? formData.courseSlug || null : null,
    subject: formData.subject.trim(),
    message: formData.message.trim(),
  }

  await axios.post(`${baseUrl}/contact`, payload, { withCredentials: true, timeout: 10000 })
  return { configured: true }
}

export default submitContactInquiry