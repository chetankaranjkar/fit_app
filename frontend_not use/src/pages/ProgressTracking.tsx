import { useState, useEffect } from 'react'
import { progressTrackingApi } from '../services/api'
import { ProgressTracking as ProgressTrackingType } from '../types'
import UserDropdown from '../components/UserDropdown'

const ProgressTracking = () => {
  const [trackings, setTrackings] = useState<ProgressTrackingType[]>([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    userId: 0,
    weight: '',
    bodyFatPercentage: '',
    muscleMass: '',
    height: '',
    bmr: '',
    bmi: '',
    notes: '',
    progressPictures: '',
  })

  useEffect(() => {
    loadTrackings()
  }, [])

  const loadTrackings = async () => {
    try {
      const response = await progressTrackingApi.getAll()
      setTrackings(response.data)
    } catch (error) {
      console.error('Error loading progress trackings:', error)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await progressTrackingApi.create({
        ...formData,
        userId: parseInt(formData.userId.toString()),
        weight: parseFloat(formData.weight),
        bodyFatPercentage: formData.bodyFatPercentage ? parseFloat(formData.bodyFatPercentage) : null,
        muscleMass: formData.muscleMass ? parseFloat(formData.muscleMass) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        bmr: formData.bmr ? parseFloat(formData.bmr) : null,
        bmi: formData.bmi ? parseFloat(formData.bmi) : null,
      })
      setShowModal(false)
      setFormData({
        userId: 0,
        weight: '',
        bodyFatPercentage: '',
        muscleMass: '',
        height: '',
        bmr: '',
        bmi: '',
        notes: '',
        progressPictures: '',
      })
      loadTrackings()
    } catch (error) {
      console.error('Error creating progress tracking:', error)
      alert('Error creating progress tracking')
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this progress tracking?')) {
      try {
        await progressTrackingApi.delete(id)
        loadTrackings()
      } catch (error) {
        console.error('Error deleting progress tracking:', error)
        alert('Error deleting progress tracking')
      }
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h2>Progress Tracking</h2>
        <button className="btn btn-primary" onClick={() => { setFormData({ ...formData, userId: users.length > 0 ? users[0].id : 0 }); setShowModal(true); }}>
          Add Progress
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User</th>
            <th>Date</th>
            <th>Weight (kg)</th>
            <th>BMI</th>
            <th>BMR</th>
            <th>Body Fat %</th>
            <th>Muscle Mass (kg)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {trackings.map((tracking) => (
            <tr key={tracking.id}>
              <td>{tracking.id}</td>
              <td>{tracking.userName}</td>
              <td>{new Date(tracking.trackDate).toLocaleDateString()}</td>
              <td>{tracking.weight}</td>
              <td>{tracking.bmi?.toFixed(2) || '-'}</td>
              <td>{tracking.bmr?.toFixed(2) || '-'}</td>
              <td>{tracking.bodyFatPercentage?.toFixed(2) || '-'}</td>
              <td>{tracking.muscleMass?.toFixed(2) || '-'}</td>
              <td>
                <button className="btn btn-danger" onClick={() => handleDelete(tracking.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Progress Tracking</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>User *</label>
                <UserDropdown
                  selectedUserId={formData.userId || null}
                  onUserSelect={(userId) => setFormData({ ...formData, userId: userId || 0 })}
                  placeholder="Search user..."
                />
              </div>
              <div className="form-group">
                <label>Weight (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Height (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>BMI</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bmi}
                  onChange={(e) => setFormData({ ...formData, bmi: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>BMR</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bmr}
                  onChange={(e) => setFormData({ ...formData, bmr: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Body Fat %</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.bodyFatPercentage}
                  onChange={(e) => setFormData({ ...formData, bodyFatPercentage: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Muscle Mass (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.muscleMass}
                  onChange={(e) => setFormData({ ...formData, muscleMass: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Progress Pictures (JSON array of URLs)</label>
                <textarea
                  value={formData.progressPictures}
                  onChange={(e) => setFormData({ ...formData, progressPictures: e.target.value })}
                  placeholder='["https://example.com/image1.jpg", "https://example.com/image2.jpg"]'
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProgressTracking

