import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const getBaseUrl = () => apiBaseUrl

export async function getStudentDashboard() {
  const response = await axios.get(`${getBaseUrl()}/student/dashboard`, { withCredentials: true, timeout: 10000 })
  return response.data?.data ?? null
}

export async function getStudentEnrollments({ status = 'all', search = '', page = 1, limit = 12 } = {}) {
  const response = await axios.get(`${getBaseUrl()}/student/enrollments`, { params: { status, search, page, limit }, withCredentials: true, timeout: 10000 })
  return response.data?.data ?? { enrollments: [], pagination: { page, limit, totalItems: 0, totalPages: 0 } }
}

export const fetchStudentDashboard = getStudentDashboard
export const fetchMyCourses = async (options) => (await getStudentEnrollments(options)).enrollments
export default getStudentDashboard
