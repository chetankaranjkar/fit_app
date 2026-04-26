import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardApi } from '../services/api'
import { DashboardStatistics } from '../types'
import BodyPartsVisual from '../components/BodyPartsVisual'

const Dashboard = () => {
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadStatistics()
  }, [])

  const loadStatistics = async () => {
    try {
      const response = await dashboardApi.getStatistics()
      setStatistics(response.data)
    } catch (error) {
      console.error('Error loading statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Error loading dashboard</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 h-full w-full">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold text-slate-800">Admin Dashboard</h1>
        <button
          onClick={loadStatistics}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/admin/exercises')}
          className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-blue-500 hover:border-blue-600"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">🏋️</div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Add Exercise</h3>
            <p className="text-gray-600 text-sm">Create new exercises for the gym</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/instructor/schedules')}
          className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-green-500 hover:border-green-600"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">📅</div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Create Schedule</h3>
            <p className="text-gray-600 text-sm">Set workout schedules for users</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/instructors')}
          className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border-2 border-purple-500 hover:border-purple-600"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">👨‍🏫</div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Add Instructor</h3>
            <p className="text-gray-600 text-sm">Register new gym instructors</p>
          </div>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Users Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Users</p>
              <p className="text-4xl font-bold mt-2">{statistics.totalUsers}</p>
              <p className="text-blue-100 text-sm mt-2">Users registered in gym</p>
            </div>
            <div className="text-6xl opacity-50">👥</div>
          </div>
        </div>

        {/* Total Instructors Card */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Instructors</p>
              <p className="text-4xl font-bold mt-2">{statistics.totalInstructors}</p>
              <p className="text-purple-100 text-sm mt-2">Active gym instructors</p>
            </div>
            <div className="text-6xl opacity-50">👨‍🏫</div>
          </div>
        </div>
      </div>

      {/* Body Parts Visual */}
      <div className="bg-white rounded-lg shadow-lg">
        <BodyPartsVisual />
      </div>

      {/* Instructors with User Count */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Instructors & Linked Users</h2>
        
        {statistics.instructorsWithUserCount.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No instructors found or no users linked to instructors yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Instructor Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Linked Users</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {statistics.instructorsWithUserCount.map((instructor) => (
                  <tr key={instructor.instructorId} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                      {instructor.instructorName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{instructor.instructorEmail}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                        {instructor.userCount} {instructor.userCount === 1 ? 'User' : 'Users'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/instructor/schedules?instructorId=${instructor.instructorId}`)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      >
                        View Schedules
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

