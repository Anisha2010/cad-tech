import api from './api.js'

export const fetchCourseAssessments = (courseId, filters = {}) => api.get(`/instructor/courses/${courseId}/assessments`, { params: filters }).then((response) => response.data?.data ?? response.data)
export const getCourseAssessments = fetchCourseAssessments

export const createInstructorQuiz = (courseId, payload = {}) => api.post(`/instructor/courses/${courseId}/quizzes`, payload).then((response) => response.data?.data ?? response.data)
export const createQuiz = createInstructorQuiz
export const getInstructorQuiz = (courseId, quizId) => api.get(`/instructor/courses/${courseId}/quizzes/${quizId}`).then((response) => response.data?.data ?? response.data)
export const getQuiz = getInstructorQuiz
export const updateInstructorQuiz = (courseId, quizId, payload) => api.patch(`/instructor/courses/${courseId}/quizzes/${quizId}`, payload).then((response) => response.data?.data ?? response.data)
export const updateQuiz = updateInstructorQuiz
export const addQuizQuestion = (courseId, quizId, payload) => api.post(`/instructor/courses/${courseId}/quizzes/${quizId}/questions`, payload).then((response) => response.data?.data ?? response.data)
export const updateQuizQuestion = (courseId, quizId, questionId, payload) => api.patch(`/instructor/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`, payload).then((response) => response.data?.data ?? response.data)
export const reorderQuizQuestions = (courseId, quizId, orderedQuestionIds) => api.patch(`/instructor/courses/${courseId}/quizzes/${quizId}/questions/reorder`, { orderedQuestionIds }).then((response) => response.data?.data ?? response.data)
export const deleteQuizQuestion = (courseId, quizId, questionId) => api.delete(`/instructor/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`).then((response) => response.data?.data ?? response.data)
export const submitInstructorQuizForReview = (courseId, quizId) => api.post(`/instructor/courses/${courseId}/quizzes/${quizId}/submit-review`).then((response) => response.data?.data ?? response.data)
export const submitQuizForReview = submitInstructorQuizForReview
export const archiveInstructorQuiz = (courseId, quizId) => api.delete(`/instructor/courses/${courseId}/quizzes/${quizId}`).then((response) => response.data?.data ?? response.data)
export const archiveQuiz = archiveInstructorQuiz

export const createInstructorAssignment = (courseId, payload = {}) => api.post(`/instructor/courses/${courseId}/assignments`, payload).then((response) => response.data?.data ?? response.data)
export const getInstructorAssignment = (courseId, assignmentId) => api.get(`/instructor/courses/${courseId}/assignments/${assignmentId}`).then((response) => response.data?.data ?? response.data)
export const updateInstructorAssignment = (courseId, assignmentId, payload) => api.patch(`/instructor/courses/${courseId}/assignments/${assignmentId}`, payload).then((response) => response.data?.data ?? response.data)
export const submitInstructorAssignmentForReview = (courseId, assignmentId) => api.post(`/instructor/courses/${courseId}/assignments/${assignmentId}/submit-review`).then((response) => response.data?.data ?? response.data)
export const archiveInstructorAssignment = (courseId, assignmentId) => api.delete(`/instructor/courses/${courseId}/assignments/${assignmentId}`).then((response) => response.data?.data ?? response.data)

export default {
  fetchCourseAssessments,
  getCourseAssessments,
  createInstructorQuiz,
  createQuiz,
  getInstructorQuiz,
  getQuiz,
  updateInstructorQuiz,
  updateQuiz,
  addQuizQuestion,
  updateQuizQuestion,
  reorderQuizQuestions,
  deleteQuizQuestion,
  submitInstructorQuizForReview,
  submitQuizForReview,
  archiveInstructorQuiz,
  archiveQuiz,
  createInstructorAssignment,
  getInstructorAssignment,
  updateInstructorAssignment,
  submitInstructorAssignmentForReview,
  archiveInstructorAssignment
}
