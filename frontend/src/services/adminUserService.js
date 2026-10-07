import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const request = async (method, path, data = null, params = {}) => {
  const response = await axios({
    method,
    url: `${apiBaseUrl}${path}`,
    data,
    params,
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data ?? response.data
}

const rolePath = (role) => {
  if (!['student', 'instructor'].includes(role)) throw new Error('Unsupported user role.')
  return `/admin/users/${role}`
}

export const fetchAdminUsers = (role, params = {}) => request('get', rolePath(role), null, params)
export const fetchAdminUser = (role, userId) => request('get', `${rolePath(role)}/${encodeURIComponent(userId)}`)
export const updateAdminUserStatus = (role, userId, status) => request('patch', `${rolePath(role)}/${encodeURIComponent(userId)}/status`, { status })
export const deleteAdminUser = (role, userId) => request('delete', `${rolePath(role)}/${encodeURIComponent(userId)}`)

export default { fetchAdminUsers, fetchAdminUser, updateAdminUserStatus, deleteAdminUser }
