import axios from 'axios'
import apiBaseUrl from '../config/api.js'

const request = (method, path, data = null, params = {}) => axios({
  method,
  url: `${apiBaseUrl}${path}`,
  data,
  params,
  withCredentials: true,
  timeout: 20000
})

export const fetchMyCadDownloads = () => request('get', '/student/cad-downloads')
export const checkCadProductAccess = (productId) => request('get', `/student/cad-products/${productId}/access`)
export const claimCadProductAccess = (productId) => request('post', `/student/cad-products/${productId}/claim`)
export const requestCadDownload = (productId) => request('post', `/student/cad-products/${productId}/download`)

export default {
  fetchMyCadDownloads,
  checkCadProductAccess,
  claimCadProductAccess,
  requestCadDownload
}
