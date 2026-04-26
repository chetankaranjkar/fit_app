import { useState, useEffect } from 'react'
import { exercisesApi, bodyPartsApi } from '../services/api'
import { Exercise, BodyPart, ExerciseStep } from '../types'
import BodyPartsVisual from '../components/BodyPartsVisual'

const Exercises = () => {
  const [showVisual, setShowVisual] = useState(true)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    steps: '', // Kept for backward compatibility
    videoUrl: '',
    difficultyLevel: 'Beginner',
    equipmentRequired: '',
    bodyPartId: 0,
  })
  const [exerciseSteps, setExerciseSteps] = useState<ExerciseStep[]>([])

  useEffect(() => {
    loadExercises()
    loadBodyParts()
  }, [])

  const loadExercises = async () => {
    try {
      setLoading(true)
      const response = await exercisesApi.getAll()
      setExercises(response.data)
    } catch (error) {
      console.error('Error loading exercises:', error)
      alert('Error loading exercises')
    } finally {
      setLoading(false)
    }
  }

  const loadBodyParts = async () => {
    try {
      const response = await bodyPartsApi.getAll()
      setBodyParts(response.data)
      if (response.data.length > 0 && formData.bodyPartId === 0) {
        setFormData(prev => ({ ...prev, bodyPartId: response.data[0].id }))
      }
    } catch (error) {
      console.error('Error loading body parts:', error)
    }
  }

  const resetForm = () => {
    setEditingExercise(null)
    setExerciseSteps([])
    setFormData({
      name: '',
      description: '',
      steps: '',
      videoUrl: '',
      difficultyLevel: 'Beginner',
      equipmentRequired: '',
      bodyPartId: bodyParts.length > 0 ? bodyParts[0].id : 0,
    })
  }

  const handleOpenModal = (exercise?: Exercise) => {
    if (exercise) {
      setEditingExercise(exercise)
      setFormData({
        name: exercise.name,
        description: exercise.description || '',
        steps: exercise.steps,
        videoUrl: exercise.videoUrl || '',
        difficultyLevel: exercise.difficultyLevel,
        equipmentRequired: exercise.equipmentRequired || '',
        bodyPartId: exercise.bodyPartId,
      })
      // Load exercise steps if available
      if (exercise.exerciseSteps && exercise.exerciseSteps.length > 0) {
        const sortedSteps = [...exercise.exerciseSteps].sort((a, b) => a.stepNumber - b.stepNumber)
        setExerciseSteps(sortedSteps.map(es => ({
          stepNumber: es.stepNumber,
          description: es.description,
          imageUrl: es.imageUrl || '',
        })))
      } else {
        setExerciseSteps([])
      }
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    resetForm()
  }

  const addStep = () => {
    const sorted = [...exerciseSteps].sort((a, b) => a.stepNumber - b.stepNumber)
    const newStepNumber = sorted.length > 0 
      ? sorted[sorted.length - 1].stepNumber + 1
      : 1
    setExerciseSteps([...exerciseSteps, {
      stepNumber: newStepNumber,
      description: '',
      imageUrl: '',
    }])
  }

  const removeStep = (index: number) => {
    setExerciseSteps(exerciseSteps.filter((_, i) => i !== index))
  }

  const updateStep = (index: number, field: keyof ExerciseStep, value: string | number) => {
    const updated = [...exerciseSteps]
    updated[index] = { ...updated[index], [field]: value }
    setExerciseSteps(updated)
  }

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === exerciseSteps.length - 1) return

    const sorted = [...exerciseSteps].sort((a, b) => a.stepNumber - b.stepNumber)
    const updated = [...sorted]
    
    if (direction === 'up') {
      const temp = updated[index]
      updated[index] = updated[index - 1]
      updated[index - 1] = temp
    } else {
      const temp = updated[index]
      updated[index] = updated[index + 1]
      updated[index + 1] = temp
    }
    
    // Re-number steps sequentially
    updated.forEach((step, i) => {
      step.stepNumber = i + 1
    })
    
    setExerciseSteps(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate that at least one step is provided
    if (exerciseSteps.length === 0) {
      alert('Please add at least one step for the exercise')
      return
    }

    // Validate all steps have descriptions
    const invalidSteps = exerciseSteps.filter(step => !step.description.trim())
    if (invalidSteps.length > 0) {
      alert('Please provide a description for all steps')
      return
    }

    try {
      setLoading(true)
      const submitData = {
        ...formData,
        exerciseSteps: exerciseSteps.map(step => ({
          stepNumber: step.stepNumber,
          description: step.description.trim(),
          imageUrl: step.imageUrl?.trim() || undefined,
        })),
      }

      if (editingExercise) {
        await exercisesApi.update(editingExercise.id, submitData)
      } else {
        await exercisesApi.create(submitData)
      }
      handleCloseModal()
      loadExercises()
    } catch (error: any) {
      console.error('Error saving exercise:', error)
      const errorMessage = error.response?.data?.message || error.response?.data || 'Error saving exercise'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this exercise?')) {
      try {
        setLoading(true)
        await exercisesApi.delete(id)
        loadExercises()
      } catch (error) {
        console.error('Error deleting exercise:', error)
        alert('Error deleting exercise')
      } finally {
        setLoading(false)
      }
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-100 text-green-800'
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'Advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Exercises Management</h2>
          <p className="text-gray-600 mt-1">Manage exercise library and instructions</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 ${
                showVisual
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => setShowVisual(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Visual Selector
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 ${
                !showVisual
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => setShowVisual(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              List View
            </button>
          </div>
          <button
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold"
            onClick={() => handleOpenModal()}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Exercise
          </button>
        </div>
      </div>

      {showVisual ? (
        <BodyPartsVisual />
      ) : (
        <>
          {/* Loading State */}
          {loading && exercises.length === 0 && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Exercises Table */}
          {!loading || exercises.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-gray-50">
                    <th className="p-4 text-left border-b text-slate-800 font-semibold">ID</th>
                    <th className="p-4 text-left border-b text-slate-800 font-semibold">Name</th>
                    <th className="p-4 text-left border-b text-slate-800 font-semibold">Body Part</th>
                    <th className="p-4 text-left border-b text-slate-800 font-semibold">Difficulty</th>
                    <th className="p-4 text-left border-b text-slate-800 font-semibold">Equipment</th>
                    <th className="p-4 text-left border-b text-slate-800 font-semibold">Steps</th>
                    <th className="p-4 text-left border-b text-slate-800 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exercises.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        No exercises found. Click "Add Exercise" to create one.
                      </td>
                    </tr>
                  ) : (
                    exercises.map((exercise) => (
                      <tr key={exercise.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 border-b">{exercise.id}</td>
                        <td className="p-4 border-b">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                              🏋️
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800">{exercise.name}</div>
                              {exercise.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {exercise.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 border-b">
                          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {exercise.bodyPartName}
                          </span>
                        </td>
                        <td className="p-4 border-b">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(exercise.difficultyLevel)}`}>
                            {exercise.difficultyLevel}
                          </span>
                        </td>
                        <td className="p-4 border-b">
                          {exercise.equipmentRequired ? (
                            <span className="text-gray-700">{exercise.equipmentRequired}</span>
                          ) : (
                            <span className="text-gray-400 italic">None</span>
                          )}
                        </td>
                        <td className="p-4 border-b">
                          <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                            {exercise.exerciseSteps?.length || 0} {exercise.exerciseSteps?.length === 1 ? 'Step' : 'Steps'}
                          </span>
                        </td>
                        <td className="p-4 border-b">
                          <div className="flex gap-2">
                            <button
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                              onClick={() => handleOpenModal(exercise)}
                              title="Edit Exercise"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              Edit
                            </button>
                            {exercise.videoUrl && (
                              <a
                                href={exercise.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                                title="View Video"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                                Video
                              </a>
                            )}
                            <button
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                              onClick={() => handleDelete(exercise.id)}
                              title="Delete Exercise"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Add/Edit Exercise Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Modal Header */}
                <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold">
                      {editingExercise ? 'Edit Exercise' : 'Add New Exercise'}
                    </h3>
                    <button
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-colors"
                      onClick={handleCloseModal}
                      disabled={loading}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="md:col-span-2">
                      <label className="block mb-2 text-slate-800 font-semibold">
                        Exercise Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Bench Press, Squat, Deadlift"
                      />
                    </div>

                    {/* Body Part */}
                    <div>
                      <label className="block mb-2 text-slate-800 font-semibold">
                        Body Part <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                        value={formData.bodyPartId}
                        onChange={(e) => setFormData({ ...formData, bodyPartId: parseInt(e.target.value) })}
                      >
                        <option value={0}>Select Body Part</option>
                        {bodyParts.map((bp) => (
                          <option key={bp.id} value={bp.id}>
                            {bp.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Difficulty Level */}
                    <div>
                      <label className="block mb-2 text-slate-800 font-semibold">
                        Difficulty Level <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                        value={formData.difficultyLevel}
                        onChange={(e) => setFormData({ ...formData, difficultyLevel: e.target.value })}
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>

                    {/* Equipment Required */}
                    <div>
                      <label className="block mb-2 text-slate-800 font-semibold">Equipment Required</label>
                      <input
                        type="text"
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                        value={formData.equipmentRequired}
                        onChange={(e) => setFormData({ ...formData, equipmentRequired: e.target.value })}
                        placeholder="e.g., Barbell, Dumbbells, None"
                      />
                    </div>

                    {/* Video URL */}
                    <div>
                      <label className="block mb-2 text-slate-800 font-semibold">Video URL</label>
                      <input
                        type="url"
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                        value={formData.videoUrl}
                        onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="block mb-2 text-slate-800 font-semibold">Description</label>
                      <textarea
                        rows={3}
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors resize-none"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of the exercise..."
                      />
                    </div>

                    {/* Exercise Steps Section */}
                    <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-2">
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-slate-800 font-semibold text-lg">
                          Exercise Steps <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={addStep}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Step
                        </button>
                      </div>

                      {exerciseSteps.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                          <p>No steps added yet. Click "Add Step" to create the first step.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {exerciseSteps
                            .sort((a, b) => a.stepNumber - b.stepNumber)
                            .map((step, index) => (
                              <div key={index} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                                <div className="flex items-start gap-4">
                                  {/* Step Number Badge */}
                                  <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                                      {step.stepNumber}
                                    </div>
                                  </div>

                                  {/* Step Content */}
                                  <div className="flex-1 space-y-3">
                                    <div>
                                      <label className="block mb-2 text-slate-800 font-semibold text-sm">
                                        Step Description <span className="text-red-500">*</span>
                                      </label>
                                      <textarea
                                        required
                                        rows={3}
                                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors resize-none"
                                        value={step.description}
                                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                                        placeholder="Describe this step in detail..."
                                      />
                                    </div>
                                    <div>
                                      <label className="block mb-2 text-slate-800 font-semibold text-sm">
                                        Step Image URL (Optional)
                                      </label>
                                      <input
                                        type="url"
                                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                                        value={step.imageUrl || ''}
                                        onChange={(e) => updateStep(index, 'imageUrl', e.target.value)}
                                        placeholder="https://example.com/step-image.jpg"
                                      />
                                      {step.imageUrl && (
                                        <div className="mt-2">
                                          <img
                                            src={step.imageUrl}
                                            alt={`Step ${step.stepNumber} preview`}
                                            className="max-w-full h-32 object-contain rounded-lg border-2 border-gray-300"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement
                                              target.style.display = 'none'
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Step Actions */}
                                  <div className="flex-shrink-0 flex flex-col gap-2">
                                    <button
                                      type="button"
                                      onClick={() => moveStep(index, 'up')}
                                      disabled={index === 0}
                                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                                      title="Move Up"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveStep(index, 'down')}
                                      disabled={index === exerciseSteps.length - 1}
                                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                                      title="Move Down"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeStep(index)}
                                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                                      title="Remove Step"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
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
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {editingExercise ? 'Update Exercise' : 'Create Exercise'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Exercises
