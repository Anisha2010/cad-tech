import axios from 'axios'

const getBaseUrl = () => import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '')

export async function fetchStudentDashboard() {
  const baseUrl = getBaseUrl()

  if (!baseUrl) return { configured: false, data: null, message: 'Student dashboard data is not connected yet.' }

  try {
    const response = await axios.get(`${baseUrl}/student/dashboard`, {
      withCredentials: true,
      timeout: 10000,
    })

    return { configured: true, data: response.data?.data ?? null }
  } catch (error) {
    const status = error?.response?.status
    if (status === 401 || status === 403) {
      throw error
    }

    return {
      configured: true,
      error: true,
      data: null,
      message: 'Dashboard data could not be loaded.',
      description: 'Please check your connection and try again.',
    }
  }
}

export async function fetchMyCourses() {
  const response = await axios.get(`${getBaseUrl()}/student/enrollments`, { withCredentials: true, timeout: 10000 })
  return response.data?.data?.enrollments ?? []
}

export default fetchStudentDashboard
