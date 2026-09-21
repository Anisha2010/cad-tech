import axios from 'axios'
import { apiBaseUrl } from '../config/api.js'

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 15000
})

export default api