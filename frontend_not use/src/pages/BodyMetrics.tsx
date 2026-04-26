import { useState, useEffect } from 'react'
import { bodyMetricsApi, usersApi } from '../services/api'
import { BodyMetrics, User, UserDetail } from '../types'
import BodyMetricGrid from '../components/BodyMetricGrid'
import BodyMetricsHistory from '../components/BodyMetricsHistory'
import UserDropdown from '../components/UserDropdown'

const BodyMetricsPage = () => {
  const [currentBodyMetrics, setCurrentBodyMetrics] = useState<BodyMetrics | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [editingMetric, setEditingMetric] = useState<BodyMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    userId: 0,
    measurementDate: new Date().toISOString().split('T')[0],
    weightKg: '',
    bodyFatPct: '',
    muscleMassKg: '',
    chestCm: '',
    waistCm: '',
    hipsCm: '',
    bicepsCm: '',
    thighsCm: '',
    neckCm: '',
    shouldersCm: '',
    forearmsCm: '',
    calvesCm: '',
    heightCm: '',
    notes: '',
    progressPictureUrl: '',
  })

  useEffect(() => {
    if (selectedUserId) {
      loadBodyMetrics(selectedUserId)
    } else {
      // Clear body metrics when user selection is cleared
      setCurrentBodyMetrics(null)
    }
  }, [selectedUserId])

  const loadBodyMetrics = async (userId: number) => {
    try {
      setLoading(true)
      // Use getByUser which returns an array (0 or 1 item for 1-to-1 relationship)
      const response = await bodyMetricsApi.getByUser(userId)
      const metrics = response.data as BodyMetrics[]
      console.log('Body metrics response for user', userId, ':', metrics)
      if (metrics && Array.isArray(metrics) && metrics.length > 0) {
        setCurrentBodyMetrics(metrics[0])
      } else {
        setCurrentBodyMetrics(null)
      }
    } catch (error: any) {
      console.error('Error loading body metrics:', error)
      console.error('Error details:', error.response?.data || error.message)
      setCurrentBodyMetrics(null)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      userId: selectedUserId || 0,
      measurementDate: new Date().toISOString().split('T')[0],
      weightKg: '',
      bodyFatPct: '',
      muscleMassKg: '',
      chestCm: '',
      waistCm: '',
      hipsCm: '',
      bicepsCm: '',
      thighsCm: '',
      neckCm: '',
      shouldersCm: '',
      forearmsCm: '',
      calvesCm: '',
      heightCm: '',
      notes: '',
      progressPictureUrl: '',
    })
    setEditingMetric(null)
  }

  const handleOpenModal = async (metric?: BodyMetrics) => {
    if (metric) {
      setEditingMetric(metric)
      setFormData({
        userId: metric.userId,
        measurementDate: new Date(metric.measurementDate).toISOString().split('T')[0],
        weightKg: metric.weightKg.toString(),
        bodyFatPct: metric.bodyFatPct?.toString() || '',
        muscleMassKg: metric.muscleMassKg?.toString() || '',
        chestCm: metric.chestCm?.toString() || '',
        waistCm: metric.waistCm?.toString() || '',
        hipsCm: metric.hipsCm?.toString() || '',
        bicepsCm: metric.bicepsCm?.toString() || '',
        thighsCm: metric.thighsCm?.toString() || '',
        neckCm: metric.neckCm?.toString() || '',
        shouldersCm: metric.shouldersCm?.toString() || '',
        forearmsCm: metric.forearmsCm?.toString() || '',
        calvesCm: metric.calvesCm?.toString() || '',
        heightCm: metric.heightCm?.toString() || '',
        notes: metric.notes || '',
        progressPictureUrl: metric.progressPictureUrl || '',
      })
      setShowModal(true)
    } else {
      // When adding new metrics, fetch user details to populate weight and height
      const baseFormData = {
        userId: selectedUserId || 0,
        measurementDate: new Date().toISOString().split('T')[0],
        weightKg: '',
        bodyFatPct: '',
        muscleMassKg: '',
        chestCm: '',
        waistCm: '',
        hipsCm: '',
        bicepsCm: '',
        thighsCm: '',
        neckCm: '',
        shouldersCm: '',
        forearmsCm: '',
        calvesCm: '',
        heightCm: '',
        notes: '',
        progressPictureUrl: '',
      }
      
      if (selectedUserId) {
        try {
          const userDetailsResponse = await usersApi.getUserDetails(selectedUserId)
          const userDetails = userDetailsResponse.data as UserDetail[]
          
          if (userDetails && userDetails.length > 0) {
            // Get the latest user detail (most recent measurement)
            const latestDetail = userDetails.sort((a, b) => 
              new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
            )[0]
            
            // Populate weight and height from user details
            setFormData({
              ...baseFormData,
              userId: selectedUserId,
              weightKg: latestDetail.weight.toString(),
              heightCm: latestDetail.height.toString(),
            })
          } else {
            setFormData(baseFormData)
          }
        } catch (error) {
          console.error('Error loading user details:', error)
          // If error, just use the base form without user details
          setFormData(baseFormData)
        }
      } else {
        setFormData(baseFormData)
      }
      setEditingMetric(null)
      setShowModal(true)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const payload = {
        userId: formData.userId,
        measurementDate: formData.measurementDate,
        weightKg: parseFloat(formData.weightKg),
        bodyFatPct: formData.bodyFatPct ? parseFloat(formData.bodyFatPct) : null,
        muscleMassKg: formData.muscleMassKg ? parseFloat(formData.muscleMassKg) : null,
        chestCm: formData.chestCm ? parseFloat(formData.chestCm) : null,
        waistCm: formData.waistCm ? parseFloat(formData.waistCm) : null,
        hipsCm: formData.hipsCm ? parseFloat(formData.hipsCm) : null,
        bicepsCm: formData.bicepsCm ? parseFloat(formData.bicepsCm) : null,
        thighsCm: formData.thighsCm ? parseFloat(formData.thighsCm) : null,
        neckCm: formData.neckCm ? parseFloat(formData.neckCm) : null,
        shouldersCm: formData.shouldersCm ? parseFloat(formData.shouldersCm) : null,
        forearmsCm: formData.forearmsCm ? parseFloat(formData.forearmsCm) : null,
        calvesCm: formData.calvesCm ? parseFloat(formData.calvesCm) : null,
        heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
        notes: formData.notes || null,
        progressPictureUrl: formData.progressPictureUrl || null,
      }

      if (editingMetric) {
        await bodyMetricsApi.update(editingMetric.id, payload)
      } else {
        await bodyMetricsApi.create(payload)
      }
      handleCloseModal()
      if (selectedUserId) {
        loadBodyMetrics(selectedUserId)
      }
    } catch (error) {
      console.error('Error saving body metrics:', error)
      alert('Error saving body metrics')
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

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Body Metrics</h2>
          <p className="text-gray-600 mt-1">Track and manage body measurements</p>
        </div>
        <div className="flex gap-4">
          <UserDropdown
            selectedUserId={selectedUserId}
            onUserSelect={setSelectedUserId}
            placeholder="Search user..."
          />
          {selectedUserId && (
            <button
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold"
              onClick={() => handleOpenModal()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Metrics
            </button>
          )}
        </div>
      </div>

      {!selectedUserId ? (
        <div className="text-center py-12 text-gray-500">
          Please select a user to view their body metrics
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Current Body Metrics Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-gray-50">
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Date</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Weight (kg)</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Height (cm)</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Body Fat %</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Muscle Mass (kg)</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Chest (cm)</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Waist (cm)</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Hips (cm)</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Biceps (cm)</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Thighs (cm)</th>
                  <th className="p-4 text-left border-b text-slate-800 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!currentBodyMetrics ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-gray-500">
                      No body metrics recorded yet. Click "Add Metrics" to create one.
                    </td>
                  </tr>
                ) : (
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 border-b font-medium">{formatDate(currentBodyMetrics.measurementDate)}</td>
                    <td className="p-4 border-b">{currentBodyMetrics.weightKg.toFixed(1)}</td>
                    <td className="p-4 border-b">{currentBodyMetrics.heightCm ? currentBodyMetrics.heightCm.toFixed(1) : '-'}</td>
                    <td className="p-4 border-b">{currentBodyMetrics.bodyFatPct ? `${currentBodyMetrics.bodyFatPct.toFixed(1)}%` : '-'}</td>
                    <td className="p-4 border-b">{currentBodyMetrics.muscleMassKg ? currentBodyMetrics.muscleMassKg.toFixed(1) : '-'}</td>
                    <td className="p-4 border-b">{currentBodyMetrics.chestCm ? currentBodyMetrics.chestCm.toFixed(1) : '-'}</td>
                    <td className="p-4 border-b">{currentBodyMetrics.waistCm ? currentBodyMetrics.waistCm.toFixed(1) : '-'}</td>
                    <td className="p-4 border-b">{currentBodyMetrics.hipsCm ? currentBodyMetrics.hipsCm.toFixed(1) : '-'}</td>
                    <td className="p-4 border-b">{currentBodyMetrics.bicepsCm ? currentBodyMetrics.bicepsCm.toFixed(1) : '-'}</td>
                    <td className="p-4 border-b">{currentBodyMetrics.thighsCm ? currentBodyMetrics.thighsCm.toFixed(1) : '-'}</td>
                    <td className="p-4 border-b">
                      <div className="flex gap-2">
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                          onClick={() => handleOpenModal(currentBodyMetrics)}
                        >
                          Edit
                        </button>
                        <button
                          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                          onClick={() => setShowHistoryModal(true)}
                        >
                          View History
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">Body Metrics History</h3>
                <button
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-colors"
                  onClick={() => setShowHistoryModal(false)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <BodyMetricsHistory userId={selectedUserId} />
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">
                  {editingMetric ? 'Edit Body Metrics' : 'Add Body Metrics'}
                </h3>
                <button
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-colors"
                  onClick={handleCloseModal}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Body Metrics Comparison Grid */}
              {formData.userId > 0 && (
                <div className="mb-6">
                  <BodyMetricGrid userId={formData.userId} />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block mb-2 text-slate-800 font-semibold">
                    Measurement Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.measurementDate}
                    onChange={(e) => setFormData({ ...formData, measurementDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">
                    Weight (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.heightCm}
                    onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Body Fat %</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.bodyFatPct}
                    onChange={(e) => setFormData({ ...formData, bodyFatPct: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Muscle Mass (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.muscleMassKg}
                    onChange={(e) => setFormData({ ...formData, muscleMassKg: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Chest (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.chestCm}
                    onChange={(e) => setFormData({ ...formData, chestCm: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Waist (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.waistCm}
                    onChange={(e) => setFormData({ ...formData, waistCm: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Hips (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.hipsCm}
                    onChange={(e) => setFormData({ ...formData, hipsCm: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Biceps (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.bicepsCm}
                    onChange={(e) => setFormData({ ...formData, bicepsCm: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Thighs (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.thighsCm}
                    onChange={(e) => setFormData({ ...formData, thighsCm: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Neck (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.neckCm}
                    onChange={(e) => setFormData({ ...formData, neckCm: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Shoulders (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.shouldersCm}
                    onChange={(e) => setFormData({ ...formData, shouldersCm: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Forearms (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.forearmsCm}
                    onChange={(e) => setFormData({ ...formData, forearmsCm: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Calves (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.calvesCm}
                    onChange={(e) => setFormData({ ...formData, calvesCm: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-2 text-slate-800 font-semibold">Progress Picture URL</label>
                  <input
                    type="url"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    value={formData.progressPictureUrl}
                    onChange={(e) => setFormData({ ...formData, progressPictureUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-2 text-slate-800 font-semibold">Notes</label>
                  <textarea
                    rows={3}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about this measurement..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
                  onClick={handleCloseModal}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingMetric ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BodyMetricsPage

