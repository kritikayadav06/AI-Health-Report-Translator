import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setUnauthorizedHandler, tokenStore } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(tokenStore.get()))

  const logout = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!tokenStore.get()) return
    api.me().then((d) => setUser(d.user)).catch(logout).finally(() => setLoading(false))
  }, [logout])

  const login = useCallback(async (email, password) => {
    const d = await api.login({ email, password })
    tokenStore.set(d.token)
    setUser(d.user)
  }, [])

  const register = useCallback(async (payload) => {
    const d = await api.register(payload)
    tokenStore.set(d.token)
    setUser(d.user)
  }, [])

  const value = useMemo(() => ({ user, setUser, loading, login, register, logout }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
