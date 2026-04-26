import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Exercises from './pages/Exercises'
import BodyParts from './pages/BodyParts'
import WorkoutPlans from './pages/WorkoutPlans'
import UserSchedules from './pages/UserSchedules'
import Instructors from './pages/Instructors'
import ProgressTracking from './pages/ProgressTracking'
import Unauthorized from './pages/Unauthorized'
import Profile from './pages/Profile'
import BodyMetrics from './pages/BodyMetrics'
import AttendanceLogs from './pages/AttendanceLogs'
import QRScanner from './pages/QRScanner'
import MyQRCode from './pages/MyQRCode'

function AppContent() {
  const { isAuthenticated, isAdmin, isInstructor, isUser, user, logout } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const Sidebar = ({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (val: boolean) => void }) => {
    const navigate = useNavigate()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setDropdownOpen(false)
        }
      }

      if (dropdownOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [dropdownOpen])

    if (!isAuthenticated) return null

    const handleProfileClick = () => {
      setDropdownOpen(!dropdownOpen)
    }

    const handleMenuItemClick = (path: string) => {
      navigate(path)
      setDropdownOpen(false)
    }

    return (
      <aside
        className={`fixed right-0 top-0 h-screen bg-slate-800 text-white shadow-2xl z-40 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-28' : 'w-80'
        }`}
      >
        {/* Toggle Button */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {!collapsed && (
            <h1 className="text-xl font-bold transition-opacity duration-300">💪 Gym Management</h1>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-2 px-2">
            {isAdmin && (
              <>
                <li>
                  <Link
                    to="/admin/dashboard"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'Dashboard' : ''}
                  >
                    <span className="text-xl">📊</span>
                    {!collapsed && <span className="transition-opacity duration-300">Dashboard</span>}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/users"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'Users' : ''}
                  >
                    <span className="text-xl">👥</span>
                    {!collapsed && <span className="transition-opacity duration-300">Users</span>}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/instructors"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'Instructors' : ''}
                  >
                    <span className="text-xl">👨‍🏫</span>
                    {!collapsed && <span className="transition-opacity duration-300">Instructors</span>}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/exercises"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'Exercises' : ''}
                  >
                    <span className="text-xl">🏋️</span>
                    {!collapsed && <span className="transition-opacity duration-300">Exercises</span>}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/body-parts"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'Body Parts' : ''}
                  >
                    <span className="text-xl">💪</span>
                    {!collapsed && <span className="transition-opacity duration-300">Body Parts</span>}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/workout-plans"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'Workout Plans' : ''}
                  >
                    <span className="text-xl">📋</span>
                    {!collapsed && <span className="transition-opacity duration-300">Workout Plans</span>}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/body-metrics"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'Body Metrics' : ''}
                  >
                    <span className="text-xl">📏</span>
                    {!collapsed && <span className="transition-opacity duration-300">Body Metrics</span>}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/attendance"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'Attendance' : ''}
                  >
                    <span className="text-xl">✅</span>
                    {!collapsed && <span className="transition-opacity duration-300">Attendance</span>}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin/qr-scanner"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'QR Scanner' : ''}
                  >
                    <span className="text-xl">📷</span>
                    {!collapsed && <span className="transition-opacity duration-300">QR Scanner</span>}
                  </Link>
                </li>
              </>
            )}
            {(isAdmin || isUser) && (
              <>
                <li>
                  <Link
                    to="/user/attendance"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'My Attendance' : ''}
                  >
                    <span className="text-xl">✅</span>
                    {!collapsed && <span className="transition-opacity duration-300">My Attendance</span>}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/user/qr-code"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'My QR Code' : ''}
                  >
                    <span className="text-xl">📱</span>
                    {!collapsed && <span className="transition-opacity duration-300">My QR Code</span>}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/user/qr-scanner"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'QR Scanner' : ''}
                  >
                    <span className="text-xl">📷</span>
                    {!collapsed && <span className="transition-opacity duration-300">QR Scanner</span>}
                  </Link>
                </li>
              </>
            )}
            {(isAdmin || isInstructor) && (
              <>
                <li>
                  <Link
                    to="/instructor/exercises"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? (isAdmin ? 'Exercises' : 'My Exercises') : ''}
                  >
                    <span className="text-xl">🏋️</span>
                    {!collapsed && (
                      <span className="transition-opacity duration-300">
                        {isAdmin ? 'Exercises' : 'My Exercises'}
                      </span>
                    )}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/instructor/workout-plans"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? (isAdmin ? 'Workout Plans' : 'My Plans') : ''}
                  >
                    <span className="text-xl">📋</span>
                    {!collapsed && (
                      <span className="transition-opacity duration-300">{isAdmin ? 'Workout Plans' : 'My Plans'}</span>
                    )}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/instructor/schedules"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : ''
                    }`}
                    title={collapsed ? 'Schedules' : ''}
                  >
                    <span className="text-xl">📅</span>
                    {!collapsed && <span className="transition-opacity duration-300">Schedules</span>}
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-slate-700 p-4 relative" ref={dropdownRef}>
          <button
            onClick={handleProfileClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-700 transition-all duration-200 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 text-left transition-opacity duration-300">
                <div className="text-sm font-medium">{user?.fullName}</div>
                <div className="text-xs text-slate-400">{user?.role}</div>
              </div>
            )}
            {!collapsed && (
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {dropdownOpen && !collapsed && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200 animate-fadeIn">
              {(isAdmin || isUser) && (
                <>
                  <button
                    onClick={() => handleMenuItemClick('/user/schedules')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    My Schedules
                  </button>
                  <button
                    onClick={() => handleMenuItemClick('/user/progress')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    My Progress
                  </button>
                </>
              )}
              <button
                onClick={() => handleMenuItemClick('/user/profile')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Edit Profile
              </button>
              {(isAdmin || isUser) && <div className="border-t border-gray-200 my-1"></div>}
              <button
                onClick={() => {
                  logout()
                  setDropdownOpen(false)
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <main
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isAuthenticated ? (sidebarCollapsed ? 'mr-28' : 'mr-80') : ''
        } h-screen overflow-y-auto`}
      >
        <div className={`h-full w-full ${isAuthenticated ? 'p-6' : 'p-0'}`}>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/instructors"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Instructors />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exercises"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Exercises />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/body-parts"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <BodyParts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/workout-plans"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <WorkoutPlans />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/body-metrics"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <BodyMetrics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/attendance"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AttendanceLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/qr-scanner"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <QRScanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/qr-scanner"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Instructor', 'User']}>
                <QRScanner />
              </ProtectedRoute>
            }
          />

          {/* Instructor Routes */}
          <Route
            path="/instructor/exercises"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Instructor']}>
                <Exercises />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/workout-plans"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Instructor']}>
                <WorkoutPlans />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/schedules"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Instructor']}>
                <UserSchedules />
              </ProtectedRoute>
            }
          />

          {/* User Routes */}
          <Route
            path="/user/schedules"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Instructor', 'User']}>
                <UserSchedules />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/progress"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Instructor', 'User']}>
                <ProgressTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/attendance"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Instructor', 'User']}>
                <AttendanceLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/qr-code"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Instructor', 'User']}>
                <MyQRCode />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/profile"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Instructor', 'User']}>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                {isAdmin ? (
                  <Navigate to="/admin/dashboard" replace />
                ) : isInstructor ? (
                  <Navigate to="/instructor/exercises" replace />
                ) : (
                  <Navigate to="/user/schedules" replace />
                )}
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/instructor" element={<Navigate to="/instructor/exercises" replace />} />
          <Route path="/user" element={<Navigate to="/user/schedules" replace />} />
        </Routes>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App

