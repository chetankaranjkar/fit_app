import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import gymLogo from '../images/GymLogo_Login.jpg'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<number>(1) // 1 = User, 2 = Instructor, 3 = Admin
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false)
      }
    }

    if (isRoleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isRoleDropdownOpen])

  const roles = [
    { value: 1, label: 'User', icon: '👤' },
    { value: 2, label: 'Instructor', icon: '👨‍🏫' },
    { value: 3, label: 'Admin', icon: '👑' },
  ]

  const selectedRole = roles.find((r) => r.value === role) || roles[0]

  const handleRoleSelect = (roleValue: number) => {
    setRole(roleValue)
    setIsRoleDropdownOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const success = await login(username, password, role)
      if (success) {
        // Redirect based on role
        if (role === 3) { // Admin
          navigate('/admin')
        } else if (role === 2) { // Instructor
          navigate('/instructor')
        } else { // User
          navigate('/user')
        }
      } else {
        setError('Invalid username, password, or role')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Panel - Image Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden h-full">
        <img
          src={gymLogo}
          alt="Gym Logo"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right Panel - White Background */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col items-center justify-center p-8 h-full overflow-hidden">
        <div className="w-full max-w-md">
          {/* Login Title */}
          <div className="flex justify-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">LOGIN</h2>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection - Custom Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="block mb-2 text-sm font-medium text-slate-700">Select Role</label>
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="w-full p-3 bg-gray-100 rounded text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 flex items-center justify-between hover:bg-gray-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedRole.icon}</span>
                  <span>{selectedRole.label}</span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isRoleDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-fadeIn">
                  {roles.map((roleOption) => (
                    <button
                      key={roleOption.value}
                      type="button"
                      onClick={() => handleRoleSelect(roleOption.value)}
                      className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors ${role === roleOption.value ? 'bg-slate-50 text-slate-800' : 'text-slate-700'
                        }`}
                    >
                      <span className="text-xl">{roleOption.icon}</span>
                      <span className="flex-1">{roleOption.label}</span>
                      {role === roleOption.value && (
                        <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Username Input */}
            <div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-gray-100 border-none rounded text-slate-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Username"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-gray-100 border-none rounded text-slate-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-300 pr-10"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Logging in...</span>
                </>
              ) : (
                'LOGIN'
              )}
            </button>

            {/* Forgot Password Link */}
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Forgot password ?
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login

