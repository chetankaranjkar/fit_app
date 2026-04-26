import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { LoginResponse, authApi } from '../services/authApi'
import api from '../services/api'

interface AuthContextType {
  user: LoginResponse | null
  login: (username: string, password: string, role: number) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
  isInstructor: boolean
  isUser: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<LoginResponse | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')
    
    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser)
        
        // Convert numeric role to string if needed (for backwards compatibility)
        if (typeof userData.role === 'number') {
          const roleMap: { [key: number]: string } = {
            1: 'User',
            2: 'Instructor',
            3: 'Admin'
          }
          userData.role = roleMap[userData.role] || userData.role.toString()
          // Update localStorage with corrected role
          localStorage.setItem('user', JSON.stringify(userData))
        }
        
        setUser(userData)
        // Token will be automatically added by axios interceptor
      } catch (error) {
        console.error('Error parsing stored user:', error)
        localStorage.removeItem('user')
        localStorage.removeItem('token')
      }
    }
  }, [])

  const login = async (username: string, password: string, role: number): Promise<boolean> => {
    try {
      const response = await authApi.login({ username, password, role })
      const userData = response.data
      
      // Ensure role is a string (in case backend sends number, convert it)
      if (typeof userData.role === 'number') {
        const roleMap: { [key: number]: string } = {
          1: 'User',
          2: 'Instructor',
          3: 'Admin'
        }
        userData.role = roleMap[userData.role] || userData.role.toString()
      }
      
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('token', userData.token)
      
      // Token will be automatically added by axios interceptor
      
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'Admin',
    isInstructor: user?.role === 'Instructor',
    isUser: user?.role === 'User',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

