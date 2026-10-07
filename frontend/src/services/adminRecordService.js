import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const paths = {
  enrollments: '/admin/enrollments',
  payments: '/admin/payments'
}

export const fetchAdminRecords = async (type, params = {}) => {
  const path = paths[type]
  if (!path) throw new Error('Unsupported admin record type.')
  const response = await axios.get(`${apiBaseUrl}${path}`, {
    params,
    withCredentials: true,
    timeout: 15000
  })
  return response.data?.data || response.data || {}
}

export default { fetchAdminRecords }