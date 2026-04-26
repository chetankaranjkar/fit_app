import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { attendanceLogsApi } from '../services/api'
import { AttendanceLog } from '../types'
import { useAuth } from '../context/AuthContext'
import UserDropdown from '../components/UserDropdown'

const AttendanceLogs = () => {
  const { user, isAdmin } = useAuth()
  const location = useLocation()
  const isMyAttendancePage = location.pathname === '/user/attendance'
  const isAdminAttendancePage = location.pathname === '/admin/attendance'
  
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterMode, setFilterMode] = useState<'month' | 'date' | 'all'>('month')
  const [loading, setLoading] = useState(false)
  const [activeCheckIn, setActiveCheckIn] = useState<AttendanceLog | null>(null)

  const loadAttendanceLogs = async () => {
    // For "My Attendance" page, use current user's ID
    const userId = isMyAttendancePage && user?.userId ? user.userId : selectedUserId
    if (!userId) return
    try {
      setLoading(true)
      const response = await attendanceLogsApi.getByUser(userId)
      console.log('Loaded attendance logs:', response.data)
      setAttendanceLogs(response.data)
      // Check for active check-in after loading
      const active = response.data.find((log: AttendanceLog) => !log.checkOutTime)
      setActiveCheckIn(active || null)
    } catch (error) {
      console.error('Error loading attendance logs:', error)
      alert('Error loading attendance logs')
    } finally {
      setLoading(false)
    }
  }

  const loadMyAttendance = async () => {
    try {
      setLoading(true)
      let response
      if (user?.userId) {
        response = await attendanceLogsApi.getByUser(user.userId)
      } else if (user?.adminId) {
        response = await attendanceLogsApi.getByAdmin(user.adminId)
      } else {
        return
      }
      console.log('Loaded my attendance logs:', response.data)
      setAttendanceLogs(response.data)
      // Check for active check-in after loading
      const active = response.data.find((log: AttendanceLog) => !log.checkOutTime)
      setActiveCheckIn(active || null)
    } catch (error) {
      console.error('Error loading my attendance logs:', error)
      alert('Error loading attendance logs')
    } finally {
      setLoading(false)
    }
  }

  const checkActiveCheckIn = async (userId?: number) => {
    if (!userId && !user?.adminId) return
    try {
      if (userId) {
        const response = await attendanceLogsApi.getActiveCheckIn(userId)
        setActiveCheckIn(response.data || null)
      } else if (user?.adminId) {
        // For admins, find active check-in from loaded logs
        const active = attendanceLogs.find(log => !log.checkOutTime)
        setActiveCheckIn(active || null)
      }
    } catch (error) {
      // If no active check-in found, that's fine
      setActiveCheckIn(null)
    }
  }

  useEffect(() => {
    // Auto-load current user's/admin's attendance for "My Attendance" page
    if (isMyAttendancePage) {
      if (user?.userId) {
        setSelectedUserId(user.userId)
        checkActiveCheckIn(user.userId)
        loadAttendanceLogs()
      } else if (user?.adminId) {
        loadMyAttendance()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, isMyAttendancePage, isAdminAttendancePage])

  useEffect(() => {
    if (isMyAttendancePage) {
      // For "My Attendance" page, reload when user changes (not date/month - we filter client-side)
      if (user?.userId) {
        loadAttendanceLogs()
        checkActiveCheckIn(user.userId)
      } else if (user?.adminId) {
        loadMyAttendance()
      }
    } else if (isAdminAttendancePage) {
      // For admin attendance page
      if (selectedUserId) {
        // User is selected, load their attendance
        loadAttendanceLogs()
        checkActiveCheckIn(selectedUserId)
      } else {
        // No user selected, clear active check-in
        setActiveCheckIn(null)
        setAttendanceLogs([])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, isMyAttendancePage, isAdminAttendancePage, user])

  const handleCheckIn = async () => {
    const currentUserId = isMyAttendancePage 
      ? (user?.userId || (user?.adminId ? undefined : selectedUserId))
      : selectedUserId
    
    if (!currentUserId && !user?.adminId && !isMyAttendancePage) {
      alert('Please select a user')
      return
    }
    try {
      setLoading(true)
      
      // If we have a selected user ID (admin checking in a member), only send UserId
      // If it's "My Attendance" page and user is admin, send AdminId
      const checkInData: { userId: number; adminId?: number; checkInMethod: string } = {
        userId: currentUserId || 0,
        checkInMethod: 'Manual',
      }
      
      // Only add AdminId if it's the admin's own check-in (My Attendance page)
      if (isMyAttendancePage && user?.adminId && !currentUserId) {
        checkInData.adminId = user.adminId
      }
      
      await attendanceLogsApi.checkIn(checkInData)
      if (isMyAttendancePage) {
        if (user?.adminId) {
          await loadMyAttendance()
        } else {
          await loadAttendanceLogs()
          await checkActiveCheckIn(currentUserId)
        }
      } else {
        await loadAttendanceLogs()
        await checkActiveCheckIn(currentUserId)
      }
      // Reload logs after a short delay to ensure the record is saved
      setTimeout(() => {
        if (isMyAttendancePage) {
          if (user?.adminId) {
            loadMyAttendance()
          } else {
            loadAttendanceLogs()
          }
        } else {
          loadAttendanceLogs()
        }
      }, 500)
      alert('Checked in successfully!')
    } catch (error: any) {
      console.error('Error checking in:', error)
      const errorMessage = error.response?.data?.message || 'Error checking in'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOut = async () => {
    if (!activeCheckIn) return
    try {
      setLoading(true)
      await attendanceLogsApi.checkOut({
        attendanceLogId: activeCheckIn.id,
        checkOutMethod: 'Manual',
      })
      const currentUserId = isMyAttendancePage 
        ? (user?.userId || (user?.adminId ? undefined : selectedUserId))
        : selectedUserId
      if (isMyAttendancePage) {
        if (user?.adminId) {
          await loadMyAttendance()
        } else {
          await loadAttendanceLogs()
          await checkActiveCheckIn(currentUserId)
        }
      } else {
        await loadAttendanceLogs()
        await checkActiveCheckIn(currentUserId)
      }
      // Reload logs after a short delay to ensure the record is saved
      setTimeout(() => {
        if (isMyAttendancePage) {
          if (user?.adminId) {
            loadMyAttendance()
          } else {
            loadAttendanceLogs()
          }
        } else {
          loadAttendanceLogs()
        }
      }, 500)
      alert('Checked out successfully!')
    } catch (error: any) {
      console.error('Error checking out:', error)
      const errorMessage = error.response?.data?.message || 'Error checking out'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const filteredLogs = attendanceLogs.filter(log => {
    // Filter by mode
    if (filterMode === 'all') {
      return true
    }
    
    if (filterMode === 'date') {
      // Compare dates without time to handle timezone issues
      const logDate = new Date(log.attendanceDate)
      const selectedDateObj = new Date(selectedDate)
      
      // Set both to midnight in local time for accurate comparison
      logDate.setHours(0, 0, 0, 0)
      selectedDateObj.setHours(0, 0, 0, 0)
      
      return logDate.getTime() === selectedDateObj.getTime()
    }
    
    if (filterMode === 'month') {
      // Filter by month
      const logDate = new Date(log.attendanceDate)
      const logYear = logDate.getFullYear()
      const logMonth = String(logDate.getMonth() + 1).padStart(2, '0')
      const logMonthYear = `${logYear}-${logMonth}`
      
      return logMonthYear === selectedMonth
    }
    
    return true
  }).sort((a, b) => {
    // Sort by check-in time, most recent first
    return new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
  })


  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">
            {isMyAttendancePage ? 'My Attendance' : 'Attendance Logs'}
          </h2>
          <p className="text-gray-600 mt-1">
            {isMyAttendancePage 
              ? 'View your check-ins and check-outs' 
              : 'Track user check-ins and check-outs'}
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {isAdminAttendancePage && (
            <UserDropdown
              selectedUserId={selectedUserId}
              onUserSelect={setSelectedUserId}
              placeholder="Search user..."
            />
          )}
          {((selectedUserId || isMyAttendancePage) && (user?.userId || user?.adminId)) && (
            <>
              {activeCheckIn ? (
                <button
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold"
                  onClick={handleCheckOut}
                  disabled={loading}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Check Out
                </button>
              ) : (
                <button
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold"
                  onClick={handleCheckIn}
                  disabled={loading}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Check In
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Active Check-In Status - Only show when user is selected */}
      {activeCheckIn && (selectedUserId || isMyAttendancePage) && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-800">Currently Checked In</h3>
              <p className="text-sm text-green-600">
                Checked in at {formatDateTime(activeCheckIn.checkInTime)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-600">Duration</p>
              <p className="text-lg font-semibold text-green-800">
                {activeCheckIn.checkOutTime
                  ? formatDuration(activeCheckIn.durationMinutes)
                  : 'In Progress...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Section */}
      {((selectedUserId || isMyAttendancePage) && (user?.userId || user?.adminId)) && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Filter Mode Tabs */}
            <div className="flex gap-2 mb-2">
              <button
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-semibold ${
                  filterMode === 'month'
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-gray-100 border border-gray-300'
                }`}
                onClick={() => setFilterMode('month')}
              >
                By Month
              </button>
              <button
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-semibold ${
                  filterMode === 'date'
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-gray-100 border border-gray-300'
                }`}
                onClick={() => setFilterMode('date')}
              >
                By Date
              </button>
              <button
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-semibold ${
                  filterMode === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-gray-100 border border-gray-300'
                }`}
                onClick={() => setFilterMode('all')}
              >
                Show All
              </button>
            </div>

            {/* Month Filter */}
            {filterMode === 'month' && (
              <div className="flex-1 min-w-[200px]">
                <label className="block mb-2 text-slate-800 font-semibold text-sm">Select Month</label>
                <input
                  type="month"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            )}

            {/* Date Filter */}
            {filterMode === 'date' && (
              <div className="flex-1 min-w-[200px]">
                <label className="block mb-2 text-slate-800 font-semibold text-sm">Select Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            )}

            {/* Quick Actions */}
            {filterMode === 'month' && (
              <button
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm font-semibold"
                onClick={() => {
                  const now = new Date()
                  setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
                }}
              >
                Current Month
              </button>
            )}

            {filterMode === 'date' && (
              <button
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm font-semibold"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                Today
              </button>
            )}

            {/* Summary */}
            <div className="ml-auto text-sm text-gray-600">
              Showing {filteredLogs.length} of {attendanceLogs.length} records
            </div>
          </div>
        </div>
      )}

      {!selectedUserId && !isMyAttendancePage ? (
        <div className="text-center py-12 text-gray-500">
          Please select a user to view attendance logs
        </div>
      ) : loading && attendanceLogs.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Attendance Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-gray-50">
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Date</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Check In</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Check Out</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Duration</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Method</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      {filterMode === 'date' 
                        ? `No attendance records found for ${new Date(selectedDate).toLocaleDateString()}.`
                        : filterMode === 'month'
                        ? `No attendance records found for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`
                        : 'No attendance records found.'}
                      <div className="text-xs text-gray-400 mt-2">
                        Total records loaded: {attendanceLogs.length}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 border-b font-medium">
                        {new Date(log.attendanceDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="p-4 border-b">
                        <div className="flex flex-col">
                          <span className="font-medium">{formatTime(log.checkInTime)}</span>
                          <span className="text-xs text-gray-500">{log.checkInMethod || 'Manual'}</span>
                        </div>
                      </td>
                      <td className="p-4 border-b">
                        {log.checkOutTime ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{formatTime(log.checkOutTime)}</span>
                            <span className="text-xs text-gray-500">{log.checkOutMethod || 'Manual'}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4 border-b">
                        {log.durationMinutes ? (
                          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {formatDuration(log.durationMinutes)}
                          </span>
                        ) : log.isCheckedIn ? (
                          <span className="text-green-600 font-medium">In Progress</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4 border-b">
                        <span className="text-sm text-gray-600">
                          {log.checkInMethod || 'Manual'}
                          {log.checkOutMethod && ` / ${log.checkOutMethod}`}
                        </span>
                      </td>
                      <td className="p-4 border-b">
                        {log.isCheckedIn ? (
                          <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            Checked In
                          </span>
                        ) : (
                          <span className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                            Checked Out
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default AttendanceLogs

