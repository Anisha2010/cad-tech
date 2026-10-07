import axios from 'axios'
import apiBaseUrl from '../config/api.js'

async function request(method, path, payload = null, params = {}) {
  const response = await axios({
    method,
    url: `${apiBaseUrl}${path}`,
    data: payload,
    params,
    withCredentials: true,
    timeout: 20000
  })
  return response.data?.data ?? response.data
}

export const fetchAdminCadOrders = ({ page = 1, limit = 12 } = {}) => request('get', '/admin/cad-orders', null, { page, limit })

export default {
  fetchAdminCadOrders
}
