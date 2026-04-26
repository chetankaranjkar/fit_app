import { useState, useEffect } from 'react'
import { workoutPlansApi, exercisesApi, instructorsApi } from '../services/api'
import { WorkoutPlan, Exercise, Instructor } from '../types'
import { useAuth } from '../context/AuthContext'

const WorkoutPlans = () => {
  const { user } = useAuth()
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    workoutType: 'Warmup',
    duration: '',
    difficultyLevel: 'Beginner',
    instructorId: '',
    isPublic: false,
    exercises: [] as Array<{ exerciseId: number; sets: number; reps: number; restBetweenSets: number; order: number; weight?: number }>,
  })

  useEffect(() => {
    loadWorkoutPlans()
    loadExercises()
    loadInstructors()
  }, [])

  const loadWorkoutPlans = async () => {
    try {
      const response = await workoutPlansApi.getAll()
      setWorkoutPlans(response.data)
    } catch (error) {
      console.error('Error loading workout plans:', error)
    }
  }

  const loadExercises = async () => {
    try {
      const response = await exercisesApi.getAll()
      setExercises(response.data)
    } catch (error) {
      console.error('Error loading exercises:', error)
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
      // Determine creator type and ID based on current user
      let createdById: number | null = null
      let creatorType: 'User' | 'Instructor' | null = null
      
      if (user) {
        if (user.role === 'Instructor' && user.instructorId) {
          createdById = user.instructorId
          creatorType = 'Instructor'
        } else if (user.role === 'User' && user.userId) {
          createdById = user.userId
          creatorType = 'User'
        }
      }

      await workoutPlansApi.create({
        ...formData,
        duration: parseInt(formData.duration),
        instructorId: formData.instructorId ? parseInt(formData.instructorId) : null,
        createdById: createdById,
        creatorType: creatorType,
        isPublic: formData.isPublic,
        exercises: formData.exercises.map((ex, index) => ({ ...ex, order: index + 1 })),
      })
      setShowModal(false)
      resetForm()
      loadWorkoutPlans()
    } catch (error) {
      console.error('Error creating workout plan:', error)
      alert('Error creating workout plan')
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this workout plan?')) {
      try {
        await workoutPlansApi.delete(id)
        loadWorkoutPlans()
      } catch (error) {
        console.error('Error deleting workout plan:', error)
        alert('Error deleting workout plan')
      }
    }
  }

  const addExercise = () => {
    setFormData({
      ...formData,
      exercises: [...formData.exercises, { exerciseId: exercises[0]?.id || 0, sets: 3, reps: 10, restBetweenSets: 60, order: formData.exercises.length + 1 }],
    })
  }

  const removeExercise = (index: number) => {
    setFormData({
      ...formData,
      exercises: formData.exercises.filter((_, i) => i !== index),
    })
  }

  const updateExercise = (index: number, field: string, value: any) => {
    const updated = [...formData.exercises]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, exercises: updated })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      workoutType: 'Warmup',
      duration: '',
      difficultyLevel: 'Beginner',
      instructorId: '',
      isPublic: false,
      exercises: [],
    })
  }

  const workoutTypeLabels: { [key: string]: string } = {
    Warmup: 'Warmup',
    ShortHIIT: 'Short HIIT',
    LongHIIT: 'Long HIIT',
    Strength: 'Strength',
    Cardio: 'Cardio',
  }

  return (
    <div className="container">
      <div className="page-header">
        <h2>Workout Plans</h2>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          Add Workout Plan
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Duration</th>
            <th>Difficulty</th>
            <th>Creator</th>
            <th>Public</th>
            <th>Exercises</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {workoutPlans.map((plan) => (
            <tr key={plan.id}>
              <td>{plan.id}</td>
              <td>{plan.name}</td>
              <td><span className="badge badge-primary">{workoutTypeLabels[plan.workoutType] || plan.workoutType}</span></td>
              <td>{plan.duration} min</td>
              <td>{plan.difficultyLevel}</td>
              <td>
                {plan.creatorName ? (
                  <span>
                    {plan.creatorName}
                    <span className="badge badge-secondary" style={{ marginLeft: '0.5rem' }}>
                      {plan.creatorType}
                    </span>
                  </span>
                ) : (
                  <span style={{ color: '#999' }}>N/A</span>
                )}
              </td>
              <td>
                {plan.isPublic ? (
                  <span className="badge badge-success">Public</span>
                ) : (
                  <span className="badge badge-secondary">Private</span>
                )}
              </td>
              <td>{plan.exercises.length}</td>
              <td>
                <button className="btn btn-danger" onClick={() => handleDelete(plan.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Add Workout Plan</h3>
              <button className="close-btn" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Workout Type *</label>
                <select
                  required
                  value={formData.workoutType}
                  onChange={(e) => setFormData({ ...formData, workoutType: e.target.value })}
                >
                  <option value="Warmup">Warmup</option>
                  <option value="ShortHIIT">Short HIIT</option>
                  <option value="LongHIIT">Long HIIT</option>
                  <option value="Strength">Strength</option>
                  <option value="Cardio">Cardio</option>
                </select>
              </div>
              <div className="form-group">
                <label>Duration (minutes) *</label>
                <input
                  type="number"
                  required
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Difficulty Level *</label>
                <select
                  value={formData.difficultyLevel}
                  onChange={(e) => setFormData({ ...formData, difficultyLevel: e.target.value })}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
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
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  />
                  <span>Make this workout plan public</span>
                </label>
                <small style={{ color: '#666', marginTop: '0.25rem', display: 'block' }}>
                  Public workout plans can be viewed and used by all users
                </small>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label>Exercises *</label>
                  <button type="button" className="btn btn-success" onClick={addExercise}>Add Exercise</button>
                </div>
                {formData.exercises.map((exercise, index) => (
                  <div key={index} style={{ border: '1px solid #ddd', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>Exercise {index + 1}</strong>
                      <button type="button" className="btn btn-danger" onClick={() => removeExercise(index)}>Remove</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Exercise *</label>
                        <select
                          required
                          value={exercise.exerciseId}
                          onChange={(e) => updateExercise(index, 'exerciseId', parseInt(e.target.value))}
                        >
                          <option value={0}>Select Exercise</option>
                          {exercises.map((ex) => (
                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Sets *</label>
                        <input
                          type="number"
                          required
                          value={exercise.sets}
                          onChange={(e) => updateExercise(index, 'sets', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Reps *</label>
                        <input
                          type="number"
                          required
                          value={exercise.reps}
                          onChange={(e) => updateExercise(index, 'reps', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Rest (seconds) *</label>
                        <input
                          type="number"
                          required
                          value={exercise.restBetweenSets}
                          onChange={(e) => updateExercise(index, 'restBetweenSets', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.exercises.length === 0 && (
                  <p style={{ color: '#999', fontStyle: 'italic' }}>No exercises added. Click "Add Exercise" to add one.</p>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formData.exercises.length === 0}>
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

export default WorkoutPlans

