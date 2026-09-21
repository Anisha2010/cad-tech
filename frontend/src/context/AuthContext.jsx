import { createContext, useEffect, useRef, useState } from 'react'
import { getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest } from '../services/authService.js'

const AuthContext = createContext(null)

function responseUser(response) {
  const user = response?.data?.data?.user ?? response?.data?.user ?? response?.user ?? response?.data ?? null
  if (!user || !['student', 'instructor', 'admin'].includes(user.role)) return null
  return user
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const authRequestRef = useRef(0)

  useEffect(() => {
    let active = true
    const requestId = ++authRequestRef.current

    getCurrentUser()
      .then((response) => {
        if (!active || requestId !== authRequestRef.current) return
        if (!response.configured) {
          setUser(null)
          return
        }
        setUser(responseUser(response))
      })
      .catch(() => {
        if (active && requestId === authRequestRef.current) setUser(null)
      })
      .finally(() => {
        if (active && requestId === authRequestRef.current) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const login = async (credentials) => {
    const response = await loginRequest({ email: credentials.email.trim(), password: credentials.password })
    if (!response.configured) return response
    const confirmedUser = responseUser(response)
    if (!confirmedUser) throw new Error('unsupported-role')
    authRequestRef.current += 1
    setUser(confirmedUser)
    setIsLoading(false)
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
    setIsLoading(true)
    const requestId = ++authRequestRef.current

    try {
      const response = await getCurrentUser()
      if (requestId !== authRequestRef.current) return { ...response, user: user }
      if (response.configured) {
        const confirmedUser = responseUser(response)
        setUser(confirmedUser)
        return { ...response, user: confirmedUser }
      }

      setUser(null)
      return { ...response, user: null }
    } catch (error) {
      if (requestId === authRequestRef.current) setUser(null)
      return { configured: false, user: null, error }
    } finally {
      if (requestId === authRequestRef.current) setIsLoading(false)
    }
  }

  return <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), isLoading, login, register, logout, refreshUser }}>{children}</AuthContext.Provider>
}

export { AuthContext, AuthProvider }