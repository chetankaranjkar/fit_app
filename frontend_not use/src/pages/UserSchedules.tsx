import { useState, useEffect } from 'react'
import { userSchedulesApi, workoutPlansApi, instructorsApi } from '../services/api'
import { UserSchedule, WorkoutPlan, Instructor } from '../types'
import UserDropdown from '../components/UserDropdown'

const UserSchedules = () => {
  const [schedules, setSchedules] = useState<UserSchedule[]>([])
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [formData, setFormData] = useState({
    userId: 0,
    instructorId: '',
    workoutPlanId: 0,
    scheduleType: 'OneMusclePerDay',
    dayOfWeek: '0',
    startTime: '09:00',
    endTime: '10:00',
  })
  const [generateFormData, setGenerateFormData] = useState({
    userId: 0,
    scheduleType: 'OneMusclePerDay',
    startTime: '09:00',
    endTime: '10:00',
    instructorId: '',
  })

  useEffect(() => {
    loadSchedules()
    loadWorkoutPlans()
    loadInstructors()
  }, [])

  const loadSchedules = async () => {
    try {
      const response = await userSchedulesApi.getAll()
      setSchedules(response.data)
    } catch (error) {
      console.error('Error loading schedules:', error)
    }
  }


  const loadWorkoutPlans = async () => {
    try {
      const response = await workoutPlansApi.getAll()
      setWorkoutPlans(response.data)
    } catch (error) {
      console.error('Error loading workout plans:', error)
    }
  }

  const loadInstructors = async () => {
    try {
      const response = await instructorsApi.getAll()
      setInstructors(response.data)
    } catch (error) {
      console.error('Error loading instructors:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await userSchedulesApi.create({
        ...formData,
        instructorId: formData.instructorId ? parseInt(formData.instructorId) : null,
        dayOfWeek: parseInt(formData.dayOfWeek),
      })
      setShowModal(false)
      resetForm()
      loadSchedules()
    } catch (error) {
      console.error('Error creating schedule:', error)
      alert('Error creating schedule')
    }
  }

  const handleGenerateDefault = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await userSchedulesApi.generateDefault({
        ...generateFormData,
        instructorId: generateFormData.instructorId ? parseInt(generateFormData.instructorId) : null,
      })
      setShowGenerateModal(false)
      setGenerateFormData({
        userId: 0,
        scheduleType: 'OneMusclePerDay',
        startTime: '09:00',
        endTime: '10:00',
        instructorId: '',
      })
      loadSchedules()
      alert('Default schedule generated successfully!')
    } catch (error) {
      console.error('Error generating schedule:', error)
      alert('Error generating default schedule. User may already have schedules.')
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      try {
        await userSchedulesApi.delete(id)
        loadSchedules()
      } catch (error) {
        console.error('Error deleting schedule:', error)
        alert('Error deleting schedule')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      userId: users.length > 0 ? users[0].id : 0,
      instructorId: '',
      workoutPlanId: workoutPlans.length > 0 ? workoutPlans[0].id : 0,
      scheduleType: 'OneMusclePerDay',
      dayOfWeek: '0',
      startTime: '09:00',
      endTime: '10:00',
    })
  }

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <div className="container">
      <div className="page-header">
        <h2>User Schedules</h2>
        <div>
          <button className="btn btn-success" onClick={() => { setGenerateFormData({ ...generateFormData, userId: users.length > 0 ? users[0].id : 0 }); setShowGenerateModal(true); }} style={{ marginRight: '1rem' }}>
            Generate Default Schedule
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            Add Schedule
          </button>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User</th>
            <th>Day</th>
            <th>Time</th>
            <th>Workout Plan</th>
            <th>Schedule Type</th>
            <th>Instructor</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((schedule) => (
            <tr key={schedule.id}>
              <td>{schedule.id}</td>
              <td>{schedule.userName}</td>
              <td>{daysOfWeek[schedule.dayOfWeek]}</td>
              <td>{schedule.startTime} - {schedule.endTime}</td>
              <td>{schedule.workoutPlanName}</td>
              <td><span className="badge badge-primary">{schedule.scheduleType}</span></td>
              <td>{schedule.instructorName || '-'}</td>
              <td>
                <button className="btn btn-danger" onClick={() => handleDelete(schedule.id)}>
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
              <h3>Add Schedule</h3>
              <button className="close-btn" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
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
                <label>Workout Plan *</label>
                <select
                  required
                  value={formData.workoutPlanId}
                  onChange={(e) => setFormData({ ...formData, workoutPlanId: parseInt(e.target.value) })}
                >
                  <option value={0}>Select Workout Plan</option>
                  {workoutPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Schedule Type *</label>
                <select
                  required
                  value={formData.scheduleType}
                  onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value })}
                >
                  <option value="OneMusclePerDay">One Muscle Per Day</option>
                  <option value="TwoMusclesPerDay">Two Muscles Per Day</option>
                  <option value="ThreeMusclesPerDay">Three Muscles Per Day</option>
                  <option value="FullBody">Full Body</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div className="form-group">
                <label>Day of Week *</label>
                <select
                  required
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                >
                  {daysOfWeek.map((day, index) => (
                    <option key={index} value={index.toString()}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Time *</label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Instructor</label>
                <select
                  value={formData.instructorId}
                  onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                >
                  <option value="">None</option>
                  {instructors.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.firstName} {inst.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
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

      {showGenerateModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Generate Default Schedule</h3>
              <button className="close-btn" onClick={() => setShowGenerateModal(false)}>×</button>
            </div>
            <form onSubmit={handleGenerateDefault}>
              <div className="form-group">
                <label>User *</label>
                <UserDropdown
                  selectedUserId={generateFormData.userId || null}
                  onUserSelect={(userId) => setGenerateFormData({ ...generateFormData, userId: userId || 0 })}
                  placeholder="Search user..."
                />
              </div>
              <div className="form-group">
                <label>Schedule Type *</label>
                <select
                  required
                  value={generateFormData.scheduleType}
                  onChange={(e) => setGenerateFormData({ ...generateFormData, scheduleType: e.target.value })}
                >
                  <option value="OneMusclePerDay">One Muscle Per Day</option>
                  <option value="TwoMusclesPerDay">Two Muscles Per Day</option>
                </select>
                <small style={{ color: '#666', display: 'block', marginTop: '0.5rem' }}>
                  This will automatically generate a weekly schedule based on available body parts and workout plans.
                </small>
              </div>
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  required
                  value={generateFormData.startTime}
                  onChange={(e) => setGenerateFormData({ ...generateFormData, startTime: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Time *</label>
                <input
                  type="time"
                  required
                  value={generateFormData.endTime}
                  onChange={(e) => setGenerateFormData({ ...generateFormData, endTime: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Instructor</label>
                <select
                  value={generateFormData.instructorId}
                  onChange={(e) => setGenerateFormData({ ...generateFormData, instructorId: e.target.value })}
                >
                  <option value="">None</option>
                  {instructors.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.firstName} {inst.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserSchedules

