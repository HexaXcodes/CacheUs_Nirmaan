import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('nc_token'))
  const [role, setRole] = useState(() => localStorage.getItem('nc_role'))
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nc_user') || 'null') }
    catch { return null }
  })

  const login = (tokenVal, roleVal, userVal = {}) => {
    localStorage.setItem('nc_token', tokenVal)
    localStorage.setItem('nc_role', roleVal)
    localStorage.setItem('nc_user', JSON.stringify(userVal))
    setToken(tokenVal)
    setRole(roleVal)
    setUser(userVal)
  }

  const logout = () => {
    localStorage.removeItem('nc_token')
    localStorage.removeItem('nc_role')
    localStorage.removeItem('nc_user')
    setToken(null)
    setRole(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, role, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
