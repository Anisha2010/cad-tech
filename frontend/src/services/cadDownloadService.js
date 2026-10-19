import axios from 'axios'
import apiBaseUrl from '../config/api.js'
import {
  normalizeCadDownloadResponse,
  normalizeCadDownloadsResponse,
  normalizeCadProductAccessResponse
} from '../utils/cadDownloads.js'

const request = (method, path, data = null, params = {}) => axios({
  method,
  url: `${apiBaseUrl}${path}`,
  data,
  params,
  withCredentials: true,
  timeout: 20000
})

export const fetchMyCadDownloads = () => request('get', '/student/cad-downloads').then(normalizeCadDownloadsResponse)
export const checkCadProductAccess = (productId) => request('get', `/student/cad-products/${productId}/access`).then(normalizeCadProductAccessResponse)
export const claimCadProductAccess = (productId) => request('post', `/student/cad-products/${productId}/claim`)
export const requestCadDownload = (productId) => request('post', `/student/cad-products/${productId}/download`).then(normalizeCadDownloadResponse)

export default {
  fetchMyCadDownloads,
  checkCadProductAccess,
  claimCadProductAccess,
  requestCadDownload
}
