import api from './api.js'

export const fetchAdminAssessments = (filters = {}) => api.get('/admin/assessments', { params: filters }).then((response) => response.data?.data ?? response.data)
export const getAdminQuizReview = (quizId) => api.get(`/admin/quizzes/${quizId}`).then((response) => response.data?.data ?? response.data)
export const getAdminAssignmentReview = (assignmentId) => api.get(`/admin/assignments/${assignmentId}`).then((response) => response.data?.data ?? response.data)
export const approveAdminQuizReview = (quizId) => api.post(`/admin/quizzes/${quizId}/review/approve`).then((response) => response.data?.data ?? response.data)
export const requestAdminQuizChanges = (quizId, feedback) => api.post(`/admin/quizzes/${quizId}/review/request-changes`, { feedback }).then((response) => response.data?.data ?? response.data)
export const publishAdminQuiz = (quizId) => api.post(`/admin/quizzes/${quizId}/publish`).then((response) => response.data?.data ?? response.data)
export const unpublishAdminQuiz = (quizId) => api.post(`/admin/quizzes/${quizId}/unpublish`).then((response) => response.data?.data ?? response.data)
export const archiveAdminQuiz = (quizId) => api.delete(`/admin/quizzes/${quizId}`).then((response) => response.data?.data ?? response.data)
export const approveAdminAssignmentReview = (assignmentId) => api.post(`/admin/assignments/${assignmentId}/review/approve`).then((response) => response.data?.data ?? response.data)
export const requestAdminAssignmentChanges = (assignmentId, feedback) => api.post(`/admin/assignments/${assignmentId}/review/request-changes`, { feedback }).then((response) => response.data?.data ?? response.data)
export const publishAdminAssignment = (assignmentId) => api.post(`/admin/assignments/${assignmentId}/publish`).then((response) => response.data?.data ?? response.data)
export const unpublishAdminAssignment = (assignmentId) => api.post(`/admin/assignments/${assignmentId}/unpublish`).then((response) => response.data?.data ?? response.data)
export const archiveAdminAssignment = (assignmentId) => api.delete(`/admin/assignments/${assignmentId}`).then((response) => response.data?.data ?? response.data)

export default {
  fetchAdminAssessments,
  getAdminQuizReview,
  getAdminAssignmentReview,
  approveAdminQuizReview,
  requestAdminQuizChanges,
  publishAdminQuiz,
  unpublishAdminQuiz,
  archiveAdminQuiz,
  approveAdminAssignmentReview,
  requestAdminAssignmentChanges,
  publishAdminAssignment,
  unpublishAdminAssignment,
  archiveAdminAssignment
}
