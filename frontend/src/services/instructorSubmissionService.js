import api from './api.js'

export const fetchCourseSubmissions = (courseId, params = {}) => api.get(`/instructor/courses/${courseId}/submissions`, { params }).then((response) => response.data?.data ?? response.data)
export const getInstructorSubmission = (submissionId) => api.get(`/instructor/submissions/${submissionId}`).then((response) => response.data?.data ?? response.data)
export const gradeInstructorSubmission = (submissionId, payload = {}) => api.post(`/instructor/submissions/${submissionId}/grade`, payload).then((response) => response.data?.data ?? response.data)
export const requestSubmissionResubmission = (submissionId, payload = {}) => api.post(`/instructor/submissions/${submissionId}/request-resubmission`, payload).then((response) => response.data?.data ?? response.data)

export default {
  fetchCourseSubmissions,
  getInstructorSubmission,
  gradeInstructorSubmission,
  requestSubmissionResubmission
}
