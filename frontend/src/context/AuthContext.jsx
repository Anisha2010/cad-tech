import { createContext, useEffect, useState } from 'react'
import { getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest } from '../services/authService.js'

const AuthContext = createContext(null)

function responseUser(response) {
  const user = response?.data?.data?.user ?? response?.data?.user ?? response?.user ?? response?.data ?? null
  if (!user || !['student', 'instructor'].includes(user.role)) return null
  return user
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    getCurrentUser()
      .then((response) => {
        if (!active) return
        if (!response.configured) {
          setUser(null)
          return
        }
        setUser(responseUser(response))
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [])

  const login = async (credentials) => {
    const response = await loginRequest({ email: credentials.email.trim(), password: credentials.password })
    if (!response.configured) return response
    const confirmedUser = responseUser(response)
    if (!confirmedUser) throw new Error('unsupported-role')
    setUser(confirmedUser)
    return { ...response, user: confirmedUser }
  }

  const register = async (details) => registerRequest({
    name: details.name.trim(),
    email: details.email.trim(),
    phone: details.phone.trim() || null,
    role: details.role,
    password: details.password
  })

  const logout = async () => {
    try {
      return await logoutRequest()
    } finally {
      setUser(null)
    }
  }

  const refreshUser = async () => {
    const response = await getCurrentUser()
    if (response.configured) {
      const confirmedUser = responseUser(response)
      setUser(confirmedUser)
      return { ...response, user: confirmedUser }
    }
    setUser(null)
    return { ...response, user: null }
  }

  return <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), isLoading, login, register, logout, refreshUser }}>{children}</AuthContext.Provider>
}

export { AuthContext, AuthProvider }