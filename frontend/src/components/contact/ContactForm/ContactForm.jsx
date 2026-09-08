import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import courses from '../../../data/courses.js'
import services from '../../../data/services.js'
import submitContactInquiry from '../../../services/contactService.js'
import { isApiConfigured } from '../../../config/api.js'
import './ContactForm.css'

const emptyErrors = {}

function ContactForm({ initialSelection }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', inquiryType: initialSelection.type, serviceSlug: initialSelection.serviceSlug, courseSlug: initialSelection.courseSlug, subject: initialSelection.subject, message: '' })
  const [errors, setErrors] = useState(emptyErrors)
  const [status, setStatus] = useState('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const firstInvalidRef = useRef(null)
  const isConfigured = isApiConfigured

  useEffect(() => { if (Object.keys(errors).length > 0) firstInvalidRef.current?.focus() }, [errors])

  const updateField = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })); setStatusMessage('') }
  const validate = () => {
    const nextErrors = {}
    if (form.name.trim().length < 2) nextErrors.name = 'Please enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Please enter a valid email address.'
    if (form.phone.trim() && !/^(?:\+91[6-9]\d{9}|[6-9]\d{9})$/.test(form.phone.trim())) nextErrors.phone = 'Please enter a valid 10-digit Indian mobile number.'
    if (!form.inquiryType) nextErrors.inquiryType = 'Please select an inquiry type.'
    if (form.inquiryType === 'service' && !form.serviceSlug) nextErrors.serviceSlug = 'Please select a service.'
    if (form.inquiryType === 'course' && !form.courseSlug) nextErrors.courseSlug = 'Please select a course.'
    if (form.subject.trim().length < 5) nextErrors.subject = 'Please enter a subject of at least 5 characters.'
    if (form.message.trim().length < 20) nextErrors.message = 'Please describe your inquiry in at least 20 characters.'
    if (form.message.trim().length > 2000) nextErrors.message = 'Please keep your message under 2000 characters.'
    return nextErrors
  }
  const handleSubmit = async (event) => { event.preventDefault(); const nextErrors = validate(); if (Object.keys(nextErrors).length) { setErrors(nextErrors); return } if (!isConfigured) { setStatus('not-configured'); setStatusMessage('The contact form is not connected yet.'); return } setStatus('sending'); setStatusMessage(''); try { await submitContactInquiry(form); setStatus('success'); setStatusMessage('Your inquiry has been submitted.'); setForm((current) => ({ ...current, name: '', email: '', phone: '', subject: '', message: '' })) } catch { setStatus('error'); setStatusMessage('Your inquiry could not be sent. Please try again later.') } }
  const fieldProps = (field) => ({ value: form[field], onChange: (event) => updateField(field, event.target.value), 'aria-invalid': Boolean(errors[field]), 'aria-describedby': errors[field] ? `${field}-error` : undefined, ref: field === Object.keys(errors)[0] ? firstInvalidRef : undefined })
  return <form className="contact-form-card" onSubmit={handleSubmit} noValidate><h2>Send Us Your Inquiry</h2><p className="contact-form-intro">Tell us what you need, and include enough detail for us to understand your request.</p>{statusMessage && status !== 'not-configured' && <div className={`contact-status contact-status-${status}`} role={status === 'error' ? 'alert' : 'status'} aria-live="polite">{status === 'success' && <strong>Inquiry sent successfully</strong>}<span>{statusMessage}</span></div>}{!isConfigured && <div className="contact-config-notice" role="status" aria-live="polite">The contact form is not connected yet.</div>}<div className="contact-form-grid"><Field label="Full Name" id="name" required error={errors.name}><input type="text" id="name" placeholder="Enter your full name" {...fieldProps('name')} /></Field><Field label="Email Address" id="email" required error={errors.email}><input type="email" id="email" placeholder="Enter your email address" {...fieldProps('email')} /></Field><Field label="Phone Number" id="phone" error={errors.phone}><input type="tel" id="phone" placeholder="Enter your mobile number" {...fieldProps('phone')} /></Field><Field label="Inquiry Type" id="inquiryType" required error={errors.inquiryType}><select id="inquiryType" value={form.inquiryType} onChange={(event) => updateField('inquiryType', event.target.value)} aria-invalid={Boolean(errors.inquiryType)} aria-describedby={errors.inquiryType ? 'inquiryType-error' : undefined}><option value="">Select inquiry type</option><option value="general">General Inquiry</option><option value="service">Engineering Service</option><option value="course">Course Information</option><option value="model">CAD Model Inquiry</option></select></Field>{form.inquiryType === 'service' && <Field label="Selected Service" id="serviceSlug" required error={errors.serviceSlug}><select id="serviceSlug" value={form.serviceSlug} onChange={(event) => updateField('serviceSlug', event.target.value)} aria-invalid={Boolean(errors.serviceSlug)} aria-describedby={errors.serviceSlug ? 'serviceSlug-error' : undefined}><option value="">Select a service</option>{services.map((service) => <option value={service.slug} key={service.slug}>{service.title}</option>)}</select>{form.serviceSlug && <span className="context-badge">Selected service: {services.find((service) => service.slug === form.serviceSlug)?.title}</span>}</Field>}{form.inquiryType === 'course' && <Field label="Selected Course" id="courseSlug" required error={errors.courseSlug}><select id="courseSlug" value={form.courseSlug} onChange={(event) => updateField('courseSlug', event.target.value)} aria-invalid={Boolean(errors.courseSlug)} aria-describedby={errors.courseSlug ? 'courseSlug-error' : undefined}><option value="">Select a course</option>{courses.map((course) => <option value={course.slug} key={course.slug}>{course.title}</option>)}</select>{form.courseSlug && <span className="context-badge">Selected course: {courses.find((course) => course.slug === form.courseSlug)?.title}</span>}</Field>}<Field label="Subject" id="subject" required error={errors.subject}><input type="text" id="subject" placeholder="Briefly describe your inquiry" {...fieldProps('subject')} /></Field><Field label="Message" id="message" required error={errors.message} full><textarea id="message" maxLength="2000" placeholder="Share your requirements, questions, or project details." {...fieldProps('message')} /></Field></div><button className="button button-primary contact-submit" type="submit" disabled={status === 'sending' || !isConfigured}><Send size={17} /> {status === 'sending' ? 'Sending...' : 'Send Inquiry'}</button></form>
}

function Field({ label, id, required, error, full, children }) { return <div className={`contact-field ${full ? 'contact-field-full' : ''}`}><label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>{children}{error && <span className="field-error" id={`${id}-error`} role="alert">{error}</span>}</div> }
export default ContactForm