import api from './api.js'

export const getStudentAssignment = (assignmentId) => api.get(`/student/assignments/${assignmentId}`).then((response) => response.data?.data ?? response.data)
export const createStudentSubmissionDraft = (assignmentId) => api.post(`/student/assignments/${assignmentId}/submissions`).then((response) => response.data?.data ?? response.data)
export const updateStudentSubmission = (submissionId, payload = {}) => api.patch(`/student/submissions/${submissionId}`, payload).then((response) => response.data?.data ?? response.data)
export const uploadStudentSubmissionAttachment = (submissionId, formData) => api.post(`/student/submissions/${submissionId}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((response) => response.data?.data ?? response.data)
export const removeStudentSubmissionAttachment = (submissionId, attachmentId) => api.delete(`/student/submissions/${submissionId}/attachments/${attachmentId}`).then((response) => response.data?.data ?? response.data)
export const submitStudentSubmission = (submissionId) => api.post(`/student/submissions/${submissionId}/submit`).then((response) => response.data?.data ?? response.data)
export const fetchStudentSubmissions = (params = {}) => api.get('/student/submissions', { params }).then((response) => response.data?.data ?? response.data)
export const getStudentSubmissionDetail = (submissionId) => api.get(`/student/submissions/${submissionId}`).then((response) => response.data?.data ?? response.data)

export default {
  getStudentAssignment,
  createStudentSubmissionDraft,
  updateStudentSubmission,
  uploadStudentSubmissionAttachment,
  removeStudentSubmissionAttachment,
  submitStudentSubmission,
  fetchStudentSubmissions,
  getStudentSubmissionDetail
}
