import { useState, useEffect } from 'react'
import { bodyMetricsApi } from '../services/api'
import { BodyMetrics } from '../types'

interface BodyMetricGridProps {
  userId: number
}

interface MetricRow {
  label: string
  current: string | number | null
  previous: string | number | null
  unit?: string
}

const BodyMetricGrid = ({ userId }: BodyMetricGridProps) => {
  const [currentMetrics, setCurrentMetrics] = useState<BodyMetrics | null>(null)
  const [previousMetrics, setPreviousMetrics] = useState<BodyMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId && userId > 0) {
      loadMetrics()
    } else {
      // Clear metrics when userId is invalid or cleared
      setCurrentMetrics(null)
      setPreviousMetrics(null)
      setLoading(false)
    }
  }, [userId])

  const loadMetrics = async () => {
    if (!userId || userId <= 0) {
      setCurrentMetrics(null)
      setPreviousMetrics(null)
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      // Get current body metrics
      const currentResponse = await bodyMetricsApi.getByUser(userId)
      const allMetrics = currentResponse.data as BodyMetrics[]
      
      if (allMetrics && allMetrics.length > 0) {
        // Current is the first one (most recent)
        setCurrentMetrics(allMetrics[0])
        // Previous is the second one if exists
        if (allMetrics.length > 1) {
          setPreviousMetrics(allMetrics[1])
        } else {
          setPreviousMetrics(null)
        }
      } else {
        setCurrentMetrics(null)
        setPreviousMetrics(null)
      }
    } catch (error) {
      console.error('Error loading body metrics:', error)
      setCurrentMetrics(null)
      setPreviousMetrics(null)
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: number | null | undefined, unit: string = ''): string => {
    if (value === null || value === undefined) return '-'
    return `${value.toFixed(1)}${unit}`
  }

  const calculateDifference = (current: number | null | undefined, previous: number | null | undefined): string => {
    if (current === null || current === undefined || previous === null || previous === undefined) return '-'
    const diff = current - previous
    const sign = diff >= 0 ? '+' : ''
    return `${sign}${diff.toFixed(1)}`
  }

  const getDifferenceColor = (current: number | null | undefined, previous: number | null | undefined): string => {
    if (current === null || current === undefined || previous === null || previous === undefined) return ''
    const diff = current - previous
    if (diff > 0) return 'text-green-600'
    if (diff < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!currentMetrics) {
    return (
      <div className="text-center py-8 text-gray-500">
        No body metrics data available
      </div>
    )
  }

  const metrics: MetricRow[] = [
    { label: 'Weight', current: formatValue(currentMetrics.weightKg, ' kg'), previous: formatValue(previousMetrics?.weightKg, ' kg'), unit: 'kg' },
    { label: 'Height', current: formatValue(currentMetrics.heightCm, ' cm'), previous: formatValue(previousMetrics?.heightCm, ' cm'), unit: 'cm' },
    { label: 'Body Fat %', current: formatValue(currentMetrics.bodyFatPct, '%'), previous: formatValue(previousMetrics?.bodyFatPct, '%'), unit: '%' },
    { label: 'Muscle Mass', current: formatValue(currentMetrics.muscleMassKg, ' kg'), previous: formatValue(previousMetrics?.muscleMassKg, ' kg'), unit: 'kg' },
    { label: 'Chest', current: formatValue(currentMetrics.chestCm, ' cm'), previous: formatValue(previousMetrics?.chestCm, ' cm'), unit: 'cm' },
    { label: 'Waist', current: formatValue(currentMetrics.waistCm, ' cm'), previous: formatValue(previousMetrics?.waistCm, ' cm'), unit: 'cm' },
    { label: 'Hips', current: formatValue(currentMetrics.hipsCm, ' cm'), previous: formatValue(previousMetrics?.hipsCm, ' cm'), unit: 'cm' },
    { label: 'Biceps', current: formatValue(currentMetrics.bicepsCm, ' cm'), previous: formatValue(previousMetrics?.bicepsCm, ' cm'), unit: 'cm' },
    { label: 'Thighs', current: formatValue(currentMetrics.thighsCm, ' cm'), previous: formatValue(previousMetrics?.thighsCm, ' cm'), unit: 'cm' },
    { label: 'Neck', current: formatValue(currentMetrics.neckCm, ' cm'), previous: formatValue(previousMetrics?.neckCm, ' cm'), unit: 'cm' },
    { label: 'Shoulders', current: formatValue(currentMetrics.shouldersCm, ' cm'), previous: formatValue(previousMetrics?.shouldersCm, ' cm'), unit: 'cm' },
    { label: 'Forearms', current: formatValue(currentMetrics.forearmsCm, ' cm'), previous: formatValue(previousMetrics?.forearmsCm, ' cm'), unit: 'cm' },
    { label: 'Calves', current: formatValue(currentMetrics.calvesCm, ' cm'), previous: formatValue(previousMetrics?.calvesCm, ' cm'), unit: 'cm' },
  ]

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-slate-800 mb-4">Body Metrics Comparison</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-gray-50">
              <th className="p-3 text-left border-b text-slate-800 font-semibold">Metric</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold">Previous</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold">Current</th>
              <th className="p-3 text-left border-b text-slate-800 font-semibold">Difference</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, index) => {
              const currentNum = metric.label === 'Weight' ? currentMetrics.weightKg :
                               metric.label === 'Height' ? currentMetrics.heightCm :
                               metric.label === 'Body Fat %' ? currentMetrics.bodyFatPct :
                               metric.label === 'Muscle Mass' ? currentMetrics.muscleMassKg :
                               metric.label === 'Chest' ? currentMetrics.chestCm :
                               metric.label === 'Waist' ? currentMetrics.waistCm :
                               metric.label === 'Hips' ? currentMetrics.hipsCm :
                               metric.label === 'Biceps' ? currentMetrics.bicepsCm :
                               metric.label === 'Thighs' ? currentMetrics.thighsCm :
                               metric.label === 'Neck' ? currentMetrics.neckCm :
                               metric.label === 'Shoulders' ? currentMetrics.shouldersCm :
                               metric.label === 'Forearms' ? currentMetrics.forearmsCm :
                               currentMetrics.calvesCm

              const previousNum = metric.label === 'Weight' ? previousMetrics?.weightKg :
                                metric.label === 'Height' ? previousMetrics?.heightCm :
                                metric.label === 'Body Fat %' ? previousMetrics?.bodyFatPct :
                                metric.label === 'Muscle Mass' ? previousMetrics?.muscleMassKg :
                                metric.label === 'Chest' ? previousMetrics?.chestCm :
                                metric.label === 'Waist' ? previousMetrics?.waistCm :
                                metric.label === 'Hips' ? previousMetrics?.hipsCm :
                                metric.label === 'Biceps' ? previousMetrics?.bicepsCm :
                                metric.label === 'Thighs' ? previousMetrics?.thighsCm :
                                metric.label === 'Neck' ? previousMetrics?.neckCm :
                                metric.label === 'Shoulders' ? previousMetrics?.shouldersCm :
                                metric.label === 'Forearms' ? previousMetrics?.forearmsCm :
                                previousMetrics?.calvesCm

              const diff = calculateDifference(currentNum, previousNum)
              const diffColor = getDifferenceColor(currentNum, previousNum)

              return (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 border-b font-medium text-slate-700">{metric.label}</td>
                  <td className="p-3 border-b text-gray-600">{metric.previous}</td>
                  <td className="p-3 border-b font-semibold text-slate-800">{metric.current}</td>
                  <td className={`p-3 border-b font-medium ${diffColor}`}>
                    {previousMetrics ? diff : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!previousMetrics && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          No previous metrics available for comparison
        </div>
      )}
    </div>
  )
}

export default BodyMetricGrid

