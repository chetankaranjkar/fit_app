import { useState, useEffect } from 'react'
import { bodyMetricsApi } from '../services/api'
import { BodyMetricsLog } from '../types'

interface BodyMetricsHistoryProps {
  userId: number
}

const BodyMetricsHistory = ({ userId }: BodyMetricsHistoryProps) => {
  const [logs, setLogs] = useState<BodyMetricsLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [userId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const response = await bodyMetricsApi.getLogsByUser(userId)
      setLogs(response.data as BodyMetricsLog[])
    } catch (error) {
      console.error('Error loading body metrics history:', error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-'
    return value.toFixed(1)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No body metrics history available
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-slate-800 mb-4">Body Metrics History</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-gray-50">
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Date</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Weight (kg)</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Height (cm)</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Body Fat %</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Muscle Mass (kg)</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Chest (cm)</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Waist (cm)</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Hips (cm)</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Biceps (cm)</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Thighs (cm)</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Neck (cm)</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Shoulders (cm)</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Forearms (cm)</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Calves (cm)</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-3 border-b font-medium text-slate-700">{formatDate(log.measurementDate)}</td>
                <td className="p-3 border-b">{formatValue(log.weightKg)}</td>
                <td className="p-3 border-b">{formatValue(log.heightCm)}</td>
                <td className="p-3 border-b">{formatValue(log.bodyFatPct)}</td>
                <td className="p-3 border-b">{formatValue(log.muscleMassKg)}</td>
                <td className="p-3 border-b">{formatValue(log.chestCm)}</td>
                <td className="p-3 border-b">{formatValue(log.waistCm)}</td>
                <td className="p-3 border-b">{formatValue(log.hipsCm)}</td>
                <td className="p-3 border-b">{formatValue(log.bicepsCm)}</td>
                <td className="p-3 border-b">{formatValue(log.thighsCm)}</td>
                <td className="p-3 border-b">{formatValue(log.neckCm)}</td>
                <td className="p-3 border-b">{formatValue(log.shouldersCm)}</td>
                <td className="p-3 border-b">{formatValue(log.forearmsCm)}</td>
                <td className="p-3 border-b">{formatValue(log.calvesCm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-sm text-gray-500">
        Showing {logs.length} historical record{logs.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

export default BodyMetricsHistory

