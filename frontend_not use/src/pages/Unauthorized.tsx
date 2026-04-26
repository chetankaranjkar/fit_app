import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Unauthorized = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. 
          {user && (
            <span className="block mt-2">
              Your current role: <span className="font-semibold">{user.role}</span>
            </span>
          )}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Login Again
          </button>
        </div>
      </div>
    </div>
  )
}

export default Unauthorized

