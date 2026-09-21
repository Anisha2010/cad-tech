import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const getBaseUrl = () => apiBaseUrl

export async function startQuizAttempt(quizId) {
  const response = await axios.post(`${getBaseUrl()}/student/quizzes/${quizId}/attempts`, {}, {
    withCredentials: true,
    timeout: 20000
  })

  return response.data?.data ?? null
}

export async function getQuizAttempt(attemptId) {
  const response = await axios.get(`${getBaseUrl()}/student/quiz-attempts/${attemptId}`, {
    withCredentials: true,
    timeout: 20000
  })

  return response.data?.data ?? null
}

export async function saveQuizAnswer(attemptId, payload = {}) {
  const response = await axios.patch(`${getBaseUrl()}/student/quiz-attempts/${attemptId}/answers`, payload, {
    withCredentials: true,
    timeout: 20000
  })

  return response.data?.data ?? null
}

export async function submitQuizAttempt(attemptId) {
  const response = await axios.post(`${getBaseUrl()}/student/quiz-attempts/${attemptId}/submit`, {}, {
    withCredentials: true,
    timeout: 20000
  })

  return response.data?.data ?? null
}

export async function getQuizResult(quizId, attemptId) {
  const response = await axios.get(`${getBaseUrl()}/student/quizzes/${quizId}/results/${attemptId}`, {
    withCredentials: true,
    timeout: 20000
  })

  return response.data?.data ?? null
}

export async function getQuizHistory(courseId = null) {
  const response = await axios.get(`${getBaseUrl()}/student/quiz-history`, {
    params: courseId ? { courseId } : {},
    withCredentials: true,
    timeout: 20000
  })

  return response.data?.data?.attempts ?? []
}

export default {
  startQuizAttempt,
  getQuizAttempt,
  saveQuizAnswer,
  submitQuizAttempt,
  getQuizResult,
  getQuizHistory
}
