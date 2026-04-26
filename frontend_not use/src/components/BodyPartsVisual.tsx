import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { exercisesApi, bodyPartsApi } from '../services/api'
import { Exercise, BodyPart } from '../types'
import Model3DViewer from './Model3DViewer'
import { useAuth } from '../context/AuthContext'
import * as THREE from 'three'

const BodyPartsVisual = () => {
  const { isAdmin, isInstructor } = useAuth()
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([])
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [showExercises, setShowExercises] = useState(false)
  const [showAddBodyPartModal, setShowAddBodyPartModal] = useState(false)
  const [pendingBodyPartName, setPendingBodyPartName] = useState<string>('')
  const [newBodyPart, setNewBodyPart] = useState({ 
    name: '', 
    description: '', 
    imageUrl: '',
    cameraPositionJson: '' 
  })
  const [isAddingBodyPart, setIsAddingBodyPart] = useState(false)
  const [showCameraPositionModal, setShowCameraPositionModal] = useState(false)
  const [currentCameraPosition, setCurrentCameraPosition] = useState<{
    position: THREE.Vector3
    rotation: THREE.Euler
  } | null>(null)
  const [isSavingPosition, setIsSavingPosition] = useState(false)
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false)
  const [exerciseFormData, setExerciseFormData] = useState({
    name: '',
    description: '',
    steps: '',
    videoUrl: '',
    difficultyLevel: 'Beginner',
    equipmentRequired: '',
    bodyPartId: 0,
  })
  const [isSavingExercise, setIsSavingExercise] = useState(false)
  const [showCoordinatesModal, setShowCoordinatesModal] = useState(false)
  const [capturedCoordinates, setCapturedCoordinates] = useState<any>(null)
  const [showBodyPartSelectionModal, setShowBodyPartSelectionModal] = useState(false)
  const [selectedBodyPartForCoordinates, setSelectedBodyPartForCoordinates] = useState<number | null>(null)
  const [isUpdatingBodyPartCoordinates, setIsUpdatingBodyPartCoordinates] = useState(false)
  const exercisesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadBodyParts()
  }, [])


  const loadBodyParts = async () => {
    try {
      const response = await bodyPartsApi.getAll()
      setBodyParts(response.data)
    } catch (error) {
      console.error('Error loading body parts:', error)
    }
  }

  const loadExercises = async (bodyPartId: number) => {
    try {
      const response = await exercisesApi.getByBodyPart(bodyPartId)
      setExercises(response.data)
      setShowExercises(true)
      
      // Animate exercises panel in
      if (exercisesRef.current) {
        gsap.fromTo(
          exercisesRef.current,
          { opacity: 0, y: 50, scale: 0.9 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
        )
      }
    } catch (error) {
      console.error('Error loading exercises:', error)
    }
  }

  const handleBodyPartClick = async (bodyPartName: string, position: any, meshName: string) => {
    // Find the body part by name with better matching (case-insensitive, fuzzy matching)
    let bodyPart = bodyParts.find(
      (bp) => bp.name.toLowerCase() === bodyPartName.toLowerCase()
    )

    // If exact match not found, try fuzzy matching (plural/singular, partial matches)
    if (!bodyPart) {
      const normalizedBodyPartName = bodyPartName.toLowerCase().trim()
      
      // Try to find by partial match or plural/singular variations
      bodyPart = bodyParts.find((bp) => {
        const normalizedDbName = bp.name.toLowerCase()
        // Exact match
        if (normalizedDbName === normalizedBodyPartName) return true
        // One contains the other
        if (normalizedDbName.includes(normalizedBodyPartName) || normalizedBodyPartName.includes(normalizedDbName)) return true
        // Singular/plural variations (e.g., "shoulder" matches "shoulders")
        if (normalizedDbName === normalizedBodyPartName + 's' || normalizedBodyPartName === normalizedDbName + 's') return true
        if (normalizedDbName === normalizedBodyPartName.slice(0, -1) || normalizedBodyPartName === normalizedDbName.slice(0, -1)) return true
        
        return false
      })
    }

    if (bodyPart) {
      // Body part exists, show exercises
      setSelectedBodyPart(bodyPart)
      await loadExercises(bodyPart.id)
    } else {
      // Body part not found - skip if it's a generic placeholder
      if (bodyPartName.match(/^Body Part \d+$/i) || bodyPartName.match(/^mesh\s*\d+$/i)) {
        console.warn('Skipping generic body part name:', bodyPartName)
        return
      }
      
      // Try to find closest match
      console.warn('Body part not found, trying to find closest match:', { 
        clickedName: bodyPartName, 
        available: bodyParts.map(bp => bp.name) 
      })
      
      // Try to find closest match based on first few characters or common mappings
      const normalizedClickedName = bodyPartName.toLowerCase()
      const commonMappings: { [key: string]: string[] } = {
        'chest': ['pectoral', 'pecs', 'pec', 'thorax'],
        'back': ['lats', 'latissimus', 'traps', 'trapezius', 'dorsal'],
        'shoulders': ['shoulder', 'deltoid', 'delts'],
        'biceps': ['bicep'],
        'triceps': ['tricep'],
        'legs': ['leg', 'thigh', 'thighs', 'quads', 'hamstrings', 'calf'],
        'abs': ['abdominal', 'core', 'abdomen', 'stomach']
      }
      
      // Check if any body part's common variations match
      for (const bodyPartOption of bodyParts) {
        const dbName = bodyPartOption.name.toLowerCase()
        const variations = commonMappings[dbName] || []
        
        if (variations.some(v => normalizedClickedName.includes(v) || v.includes(normalizedClickedName))) {
          console.log('Found match via common mappings:', bodyPartOption.name)
          setSelectedBodyPart(bodyPartOption)
          await loadExercises(bodyPartOption.id)
          return
        }
        
        // Also check substring match
        if (normalizedClickedName.startsWith(dbName.substring(0, 3)) || dbName.startsWith(normalizedClickedName.substring(0, 3))) {
          console.log('Found closest match via substring:', bodyPartOption.name)
          setSelectedBodyPart(bodyPartOption)
          await loadExercises(bodyPartOption.id)
          return
        }
      }
      
      // If still no match, don't show add modal - this is likely a detection issue
      console.error('No match found for body part:', bodyPartName, 'Available:', bodyParts.map(bp => bp.name))
    }
  }

  const handleAddBodyPart = async () => {
    if (!newBodyPart.name.trim()) {
      alert('Body part name is required')
      return
    }

    // Parse camera position JSON if provided
    let cameraPositionJson = null
    if (newBodyPart.cameraPositionJson.trim()) {
      try {
        // Validate JSON format
        const jsonData = JSON.parse(newBodyPart.cameraPositionJson.trim())
        // Store as JSON string
        cameraPositionJson = JSON.stringify(jsonData)
      } catch (error) {
        alert('Invalid JSON format for camera position. Please check the JSON and try again.')
        setIsAddingBodyPart(false)
        return
      }
    }

    setIsAddingBodyPart(true)
    try {
      const response = await bodyPartsApi.create({
        name: newBodyPart.name.trim(),
        description: newBodyPart.description.trim() || null,
        imageUrl: newBodyPart.imageUrl.trim() || null,
        cameraPositionJson: cameraPositionJson
      })

      // Refresh body parts list (this will update the mapping in Model3DViewer)
      const refreshResponse = await bodyPartsApi.getAll()
      setBodyParts(refreshResponse.data)

      // Find the newly created body part
      const createdBodyPart = response.data
      const newBodyPartData = {
        id: createdBodyPart.id,
        name: createdBodyPart.name,
        description: createdBodyPart.description,
        imageUrl: createdBodyPart.imageUrl,
        exerciseCount: createdBodyPart.exerciseCount || 0,
        cameraPositionJson: createdBodyPart.cameraPositionJson,
      }
      setSelectedBodyPart(newBodyPartData)

      // Close modal and show exercises (will be empty initially)
      setShowAddBodyPartModal(false)
      setExercises([])
      setShowExercises(true)

      // Animate exercises panel in
      if (exercisesRef.current) {
        gsap.fromTo(
          exercisesRef.current,
          { opacity: 0, y: 50, scale: 0.9 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
        )
      }

      // Reset form
      setNewBodyPart({ name: '', description: '', imageUrl: '', cameraPositionJson: '' })
      setPendingBodyPartName('')
    } catch (error: any) {
      console.error('Error adding body part:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add body part'
      alert(`Error: ${errorMessage}`)
    } finally {
      setIsAddingBodyPart(false)
    }
  }

  const handleCancelAddBodyPart = () => {
    setShowAddBodyPartModal(false)
    setNewBodyPart({ name: '', description: '', imageUrl: '', cameraPositionJson: '' })
    setPendingBodyPartName('')
  }

  // Handle pasting camera coordinates JSON into body part form
  const handlePasteCameraCoordinates = () => {
    if (capturedCoordinates && capturedCoordinates.json) {
      setNewBodyPart({ ...newBodyPart, cameraPositionJson: capturedCoordinates.json })
      alert('Camera coordinates JSON pasted! You can edit it if needed.')
    } else {
      alert('No camera coordinates available. Please capture coordinates first by clicking on the model.')
    }
  }

  // Handle showing body part selection modal to paste coordinates into existing body part
  const handlePasteIntoBodyPart = () => {
    if (!capturedCoordinates || !capturedCoordinates.json) {
      alert('No camera coordinates available. Please capture coordinates first by clicking on the model.')
      return
    }
    setShowBodyPartSelectionModal(true)
  }

  // Handle updating existing body part with camera coordinates
  const handleUpdateBodyPartCoordinates = async () => {
    if (!selectedBodyPartForCoordinates || !capturedCoordinates) {
      alert('Please select a body part')
      return
    }

    setIsUpdatingBodyPartCoordinates(true)
    try {
      // Validate that all required values exist
      if (
        capturedCoordinates.position.x === undefined || capturedCoordinates.position.x === null ||
        capturedCoordinates.position.y === undefined || capturedCoordinates.position.y === null ||
        capturedCoordinates.position.z === undefined || capturedCoordinates.position.z === null ||
        capturedCoordinates.rotation.x === undefined || capturedCoordinates.rotation.x === null ||
        capturedCoordinates.rotation.y === undefined || capturedCoordinates.rotation.y === null ||
        capturedCoordinates.rotation.z === undefined || capturedCoordinates.rotation.z === null
      ) {
        alert('Invalid camera coordinates. Please capture coordinates again.')
        setIsUpdatingBodyPartCoordinates(false)
        return
      }

      // Create JSON string for camera position
      const cameraPosJson = {
        cameraPositionX: parseFloat(Number(capturedCoordinates.position.x).toFixed(2)),
        cameraPositionY: parseFloat(Number(capturedCoordinates.position.y).toFixed(2)),
        cameraPositionZ: parseFloat(Number(capturedCoordinates.position.z).toFixed(2)),
        cameraRotationX: parseFloat(Number(capturedCoordinates.rotation.x).toFixed(2)),
        cameraRotationY: parseFloat(Number(capturedCoordinates.rotation.y).toFixed(2)),
        cameraRotationZ: parseFloat(Number(capturedCoordinates.rotation.z).toFixed(2)),
        cameraDistance: capturedCoordinates.distance ? parseFloat(Number(capturedCoordinates.distance).toFixed(2)) : null,
        zoomLevel: capturedCoordinates.zoomLevel ? parseFloat(Number(capturedCoordinates.zoomLevel).toFixed(2)) : null,
      }

      const cameraPos = {
        cameraPositionJson: JSON.stringify(cameraPosJson)
      }

      console.log('Updating camera position with data:', {
        bodyPartId: selectedBodyPartForCoordinates,
        cameraPosJson,
        cameraPos
      })

      const response = await bodyPartsApi.updateCameraPosition(selectedBodyPartForCoordinates, cameraPos)
      console.log('Update response:', response.data)
      
      // Refresh body parts list to get updated camera position
      const refreshedResponse = await bodyPartsApi.getAll()
      setBodyParts(refreshedResponse.data)
      
      // Update selected body part if it was the one we updated
      if (selectedBodyPart?.id === selectedBodyPartForCoordinates) {
        const updatedBodyPart = refreshedResponse.data.find(bp => bp.id === selectedBodyPartForCoordinates)
        if (updatedBodyPart) {
          console.log('✅ Updated selected body part with new camera position:', updatedBodyPart)
          setSelectedBodyPart(updatedBodyPart)
        }
      }

      alert('Camera position updated successfully!')
      setShowBodyPartSelectionModal(false)
      setSelectedBodyPartForCoordinates(null)
      setShowCoordinatesModal(false)
    } catch (error: any) {
      console.error('Error updating camera position:', error)
      console.error('Error details:', {
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
        cameraPos,
        bodyPartId: selectedBodyPartForCoordinates
      })
      // Log full error details for debugging
      console.error('Full error object:', error)
      console.error('Response data:', error.response?.data)
      console.error('Response status:', error.response?.status)
      
      let errorMessage = 'Failed to update camera position'
      
      if (error.response?.data) {
        // Handle different error response formats
        if (error.response.data.message) {
          errorMessage = error.response.data.message
        } else if (error.response.data.title) {
          errorMessage = error.response.data.title
        } else if (error.response.data.errors) {
          errorMessage = JSON.stringify(error.response.data.errors)
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        } else {
          errorMessage = JSON.stringify(error.response.data)
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      alert(`Error: ${errorMessage}\n\nCheck the console for more details.`)
    } finally {
      setIsUpdatingBodyPartCoordinates(false)
    }
  }


  const handleCloseExercises = () => {
    if (exercisesRef.current) {
      gsap.to(exercisesRef.current, {
        opacity: 0,
        y: 50,
        scale: 0.9,
        duration: 0.3,
        onComplete: () => {
          setShowExercises(false)
          setExercises([])
          setSelectedBodyPart(null)
        },
      })
    } else {
      setShowExercises(false)
      setExercises([])
      setSelectedBodyPart(null)
    }
  }

  // Handle saving camera position for admin
  const handleSaveCameraPosition = async () => {
    if (!selectedBodyPart || !currentCameraPosition) {
      alert('Please select a body part and move the camera to desired position')
      return
    }

    setIsSavingPosition(true)
    try {
      // Calculate distance to target (origin)
      const target = { x: 0, y: 0, z: 0 }
      const distance = Math.sqrt(
        Math.pow(currentCameraPosition.position.x - target.x, 2) +
        Math.pow(currentCameraPosition.position.y - target.y, 2) +
        Math.pow(currentCameraPosition.position.z - target.z, 2)
      )
      
      // Calculate zoom level (default distance is 8)
      const defaultDistance = 8
      const zoomLevel = ((defaultDistance / distance) * 100).toFixed(2)
      
      const cameraPosJson = {
        cameraPositionX: parseFloat(currentCameraPosition.position.x.toFixed(2)),
        cameraPositionY: parseFloat(currentCameraPosition.position.y.toFixed(2)),
        cameraPositionZ: parseFloat(currentCameraPosition.position.z.toFixed(2)),
        cameraRotationX: parseFloat(THREE.MathUtils.radToDeg(currentCameraPosition.rotation.x).toFixed(2)),
        cameraRotationY: parseFloat(THREE.MathUtils.radToDeg(currentCameraPosition.rotation.y).toFixed(2)),
        cameraRotationZ: parseFloat(THREE.MathUtils.radToDeg(currentCameraPosition.rotation.z).toFixed(2)),
        cameraDistance: parseFloat(distance.toFixed(2)),
        zoomLevel: parseFloat(zoomLevel),
      }

      const cameraPos = {
        cameraPositionJson: JSON.stringify(cameraPosJson)
      }

      await bodyPartsApi.updateCameraPosition(selectedBodyPart.id, cameraPos)
      
      // Refresh body parts list to get updated camera position
      await loadBodyParts()
      
      // Update selected body part with new camera position
      const updatedBodyPart = bodyParts.find(bp => bp.id === selectedBodyPart.id)
      if (updatedBodyPart) {
        setSelectedBodyPart(updatedBodyPart)
      }

      alert('Camera position saved successfully!')
      setShowCameraPositionModal(false)
    } catch (error: any) {
      console.error('Error saving camera position:', error)
      alert(error.response?.data?.message || 'Failed to save camera position')
    } finally {
      setIsSavingPosition(false)
    }
  }

  // Handle capturing current camera position
  const handleCaptureCameraPosition = () => {
    if (!selectedBodyPart) {
      alert('Please select a body part first')
      return
    }
    if (!currentCameraPosition) {
      alert('Camera position not available. Please move the camera first.')
      return
    }
    setShowCameraPositionModal(true)
  }

  // Handle opening add exercise modal
  const handleOpenAddExerciseModal = () => {
    if (!selectedBodyPart) {
      alert('Please select a body part first')
      return
    }
    setExerciseFormData({
      name: '',
      description: '',
      steps: '',
      videoUrl: '',
      difficultyLevel: 'Beginner',
      equipmentRequired: '',
      bodyPartId: selectedBodyPart.id,
    })
    setShowAddExerciseModal(true)
  }

  // Handle saving exercise
  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBodyPart) {
      alert('Please select a body part first')
      return
    }

    setIsSavingExercise(true)
    try {
      await exercisesApi.create(exerciseFormData)
      setShowAddExerciseModal(false)
      setExerciseFormData({
        name: '',
        description: '',
        steps: '',
        videoUrl: '',
        difficultyLevel: 'Beginner',
        equipmentRequired: '',
        bodyPartId: selectedBodyPart.id,
      })
      
      // Refresh exercises list
      await loadExercises(selectedBodyPart.id)
      
      alert('Exercise added successfully!')
    } catch (error: any) {
      console.error('Error saving exercise:', error)
      alert(error.response?.data?.message || 'Failed to save exercise')
    } finally {
      setIsSavingExercise(false)
    }
  }

  // Reset exercise form
  const resetExerciseForm = () => {
    setExerciseFormData({
      name: '',
      description: '',
      steps: '',
      videoUrl: '',
      difficultyLevel: 'Beginner',
      equipmentRequired: '',
      bodyPartId: selectedBodyPart?.id || 0,
    })
  }


  return (
    <div className="relative w-full">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-slate-800">
            💪 Select a Body Part to View Exercises
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              Drag to rotate • Click body parts to view exercises
            </span>
          </div>
        </div>

        <div className="flex flex-row-reverse justify-start items-start gap-8 mb-8">
          {/* 3D Model Body - Right Side */}
          <div
            className="relative flex-shrink-0"
            style={{
              width: '400px',
              height: '500px',
              cursor: 'grab',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Model3DViewer
              key={selectedBodyPart?.id || 'none'}
              onBodyPartClick={handleBodyPartClick}
              selectedBodyPart={selectedBodyPart?.name || null}
              bodyParts={bodyParts.map(bp => ({ 
                id: bp.id, 
                name: bp.name,
                cameraPositionJson: bp.cameraPositionJson
              }))}
              onCameraChange={(position, rotation) => {
                // Store current camera position for admin to save
                if (isAdmin) {
                  setCurrentCameraPosition({ position, rotation })
                }
              }}
              onCaptureCoordinates={(coordinates) => {
                setCapturedCoordinates(coordinates)
                setShowCoordinatesModal(true)
              }}
            />
          </div>

          {/* Exercises Panel - Center-Left */}
          <div className="flex-1">
            {showExercises && selectedBodyPart ? (
            <div
              ref={exercisesRef}
                className="bg-gray-50 rounded-lg p-6 shadow-lg"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-slate-800">
                  Exercises for {selectedBodyPart.name}
                </h3>
                  <div className="flex items-center gap-3">
                    {(isAdmin || isInstructor) && (
                      <button
                        onClick={handleOpenAddExerciseModal}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        ➕ Add Exercise
                      </button>
                    )}
                <button
                  onClick={handleCloseExercises}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
                  </div>
              </div>

              {exercises.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg mb-4">No exercises found for {selectedBodyPart.name}.</p>
                  <p className="text-sm text-gray-400">Add exercises for this body part in the Exercises page.</p>
                </div>
              ) : (
                  <div 
                    className="space-y-4 max-h-96 scroll-container"
                    style={{
                      overflowY: 'auto',
                      scrollbarWidth: 'none', /* Firefox */
                      msOverflowStyle: 'none', /* IE and Edge */
                      WebkitOverflowScrolling: 'touch', /* Smooth scrolling on iOS */
                    }}
                  >
                  {exercises.map((exercise, index) => (
                    <div
                      key={exercise.id}
                      className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow"
                      style={{
                        animation: `slideIn 0.4s ease-out ${index * 0.1}s both`,
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-semibold text-slate-800">{exercise.name}</h4>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {exercise.difficultyLevel}
                        </span>
                      </div>

                      {exercise.description && (
                        <p className="text-gray-600 text-sm mb-2">{exercise.description}</p>
                      )}

                      <div className="text-sm text-gray-700 mb-2">
                        <strong>Steps:</strong>
                        <div className="mt-1 whitespace-pre-line">{exercise.steps}</div>
                      </div>

                      {exercise.equipmentRequired && (
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Equipment:</strong> {exercise.equipmentRequired}
                        </div>
                      )}

                      {exercise.videoUrl && (
                        <a
                          href={exercise.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center gap-1"
                        >
                          📹 Watch Video
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">Select a body part to view exercises</p>
            </div>
          )}
          </div>
        </div>

        {/* Add Body Part Modal */}
        {showAddBodyPartModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">
                Add New Body Part
              </h3>
              <p className="text-gray-600 mb-4">
                Body part "<strong>{pendingBodyPartName}</strong>" was clicked but doesn't exist in the database.
                Please add it below:
              </p>
              
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleAddBodyPart()
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block mb-2 text-slate-800 font-medium">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newBodyPart.name}
                    onChange={(e) => setNewBodyPart({ ...newBodyPart, name: e.target.value })}
                    placeholder="e.g., Chest, Back, Legs"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-medium">Description</label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded min-h-[100px] resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newBodyPart.description}
                    onChange={(e) => setNewBodyPart({ ...newBodyPart, description: e.target.value })}
                    placeholder="Optional description of this body part"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-medium">Image URL</label>
                  <input
                    type="url"
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newBodyPart.imageUrl}
                    onChange={(e) => setNewBodyPart({ ...newBodyPart, imageUrl: e.target.value })}
                    placeholder="Optional image URL"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-800 font-medium">
                    Camera Position JSON (Optional)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={handlePasteCameraCoordinates}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
                      title="Paste camera coordinates from clipboard"
                    >
                      📋 Paste from Captured Coordinates
                    </button>
                    {capturedCoordinates && (
                      <span className="text-xs text-gray-500 self-center">
                        (Coordinates modal must be open)
                      </span>
                    )}
                  </div>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded min-h-[120px] resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    value={newBodyPart.cameraPositionJson}
                    onChange={(e) => setNewBodyPart({ ...newBodyPart, cameraPositionJson: e.target.value })}
                    placeholder='Paste JSON here, e.g.:&#10;{&#10;  "cameraPositionX": 6.65,&#10;  "cameraPositionY": 2.66,&#10;  "cameraPositionZ": -0.92,&#10;  "cameraRotationX": -109.19,&#10;  "cameraRotationY": 67.06,&#10;  "cameraRotationZ": 110.70,&#10;  "cameraDistance": 7.22&#10;}'
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste the JSON from the coordinates modal. This will make the model rotate to this position when clicking this body part.
                  </p>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={handleCancelAddBodyPart}
                    disabled={isAddingBodyPart}
                    className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingBodyPart}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingBodyPart ? 'Adding...' : 'Add Body Part'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Camera Position Modal for Admin */}
        {showCameraPositionModal && selectedBodyPart && currentCameraPosition && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">
                Save Camera Position
              </h3>
              <p className="text-gray-600 mb-4">
                Save the current camera position for <strong>{selectedBodyPart.name}</strong>?
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
                <div className="mb-2"><strong>Position:</strong></div>
                <div className="ml-4 mb-2">X: {currentCameraPosition.position.x.toFixed(2)}</div>
                <div className="ml-4 mb-2">Y: {currentCameraPosition.position.y.toFixed(2)}</div>
                <div className="ml-4 mb-4">Z: {currentCameraPosition.position.z.toFixed(2)}</div>
                
                <div className="mb-2"><strong>Rotation:</strong></div>
                <div className="ml-4 mb-2">X: {THREE.MathUtils.radToDeg(currentCameraPosition.rotation.x).toFixed(2)}°</div>
                <div className="ml-4 mb-2">Y: {THREE.MathUtils.radToDeg(currentCameraPosition.rotation.y).toFixed(2)}°</div>
                <div className="ml-4">Z: {THREE.MathUtils.radToDeg(currentCameraPosition.rotation.z).toFixed(2)}°</div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCameraPositionModal(false)}
                  disabled={isSavingPosition}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCameraPosition}
                  disabled={isSavingPosition}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingPosition ? 'Saving...' : 'Save Position'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Exercise Modal */}
        {showAddExerciseModal && selectedBodyPart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800">
                  Add Exercise for {selectedBodyPart.name}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddExerciseModal(false)
                    resetExerciseForm()
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSaveExercise}>
                <div className="mb-6">
                  <label className="block mb-2 text-slate-800 font-medium">Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={exerciseFormData.name}
                    onChange={(e) => setExerciseFormData({ ...exerciseFormData, name: e.target.value })}
                    placeholder="Exercise name"
                  />
                </div>

                <div className="mb-6">
                  <label className="block mb-2 text-slate-800 font-medium">Body Part *</label>
                  <select
                    required
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={exerciseFormData.bodyPartId}
                    onChange={(e) => setExerciseFormData({ ...exerciseFormData, bodyPartId: parseInt(e.target.value) })}
                  >
                    {bodyParts.map((bp) => (
                      <option key={bp.id} value={bp.id}>
                        {bp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block mb-2 text-slate-800 font-medium">Description</label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded min-h-[100px] resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={exerciseFormData.description}
                    onChange={(e) => setExerciseFormData({ ...exerciseFormData, description: e.target.value })}
                    placeholder="Exercise description"
                  />
                </div>

                <div className="mb-6">
                  <label className="block mb-2 text-slate-800 font-medium">Steps *</label>
                  <textarea
                    required
                    className="w-full p-3 border border-gray-300 rounded min-h-[120px] resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={exerciseFormData.steps}
                    onChange={(e) => setExerciseFormData({ ...exerciseFormData, steps: e.target.value })}
                    placeholder="Step 1: ...&#10;Step 2: ..."
                  />
                </div>

                <div className="mb-6">
                  <label className="block mb-2 text-slate-800 font-medium">Video URL</label>
                  <input
                    type="url"
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={exerciseFormData.videoUrl}
                    onChange={(e) => setExerciseFormData({ ...exerciseFormData, videoUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="mb-6">
                  <label className="block mb-2 text-slate-800 font-medium">Difficulty Level *</label>
                  <select
                    required
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={exerciseFormData.difficultyLevel}
                    onChange={(e) => setExerciseFormData({ ...exerciseFormData, difficultyLevel: e.target.value })}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block mb-2 text-slate-800 font-medium">Equipment Required</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={exerciseFormData.equipmentRequired}
                    onChange={(e) => setExerciseFormData({ ...exerciseFormData, equipmentRequired: e.target.value })}
                    placeholder="e.g., Dumbbells, Barbell, Bench"
                  />
                </div>

                <div className="flex justify-end gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddExerciseModal(false)
                      resetExerciseForm()
                    }}
                    disabled={isSavingExercise}
                    className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingExercise}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingExercise ? 'Saving...' : 'Save Exercise'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Camera Coordinates Modal */}
        {showCoordinatesModal && capturedCoordinates && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800">
                  📍 Camera Coordinates
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCoordinatesModal(false)
                    setCapturedCoordinates(null)
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Copy the JSON below and paste it into the body part camera position data:
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="mb-2"><strong>Position:</strong></div>
                  <div className="ml-4 mb-2">X: {capturedCoordinates.position.x}</div>
                  <div className="ml-4 mb-2">Y: {capturedCoordinates.position.y}</div>
                  <div className="ml-4 mb-4">Z: {capturedCoordinates.position.z}</div>
                  
                  <div className="mb-2"><strong>Rotation:</strong></div>
                  <div className="ml-4 mb-2">X: {capturedCoordinates.rotation.x}°</div>
                  <div className="ml-4 mb-2">Y: {capturedCoordinates.rotation.y}°</div>
                  <div className="ml-4 mb-4">Z: {capturedCoordinates.rotation.z}°</div>
                  
                  <div className="mb-2"><strong>Distance:</strong></div>
                  <div className="ml-4 mb-4">{capturedCoordinates.distance}</div>
                  
                  {capturedCoordinates.zoomLevel !== undefined && capturedCoordinates.zoomLevel !== null && (
                    <>
                      <div className="mb-2"><strong>Zoom Level:</strong></div>
                      <div className="ml-4 mb-2">
                        <span className="font-semibold text-blue-600">{capturedCoordinates.zoomLevel}%</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(capturedCoordinates.zoomLevel.toString())
                            alert('Zoom level copied to clipboard!')
                          }}
                          className="ml-2 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                        >
                          📋 Copy
                        </button>
                      </div>
                      <div className="ml-4 text-sm text-gray-500 mb-4">(100% = default zoom, {capturedCoordinates.zoomLevel > 100 ? 'zoomed in' : 'zoomed out'})</div>
                    </>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block mb-2 text-slate-800 font-medium">JSON Data (Copy this):</label>
                  <textarea
                    readOnly
                    className="w-full p-4 border border-gray-300 rounded bg-gray-50 font-mono text-sm"
                    rows={12}
                    value={capturedCoordinates.json}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(capturedCoordinates.json)
                      alert('JSON copied to clipboard!')
                    }}
                    className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                  >
                    📋 Copy JSON to Clipboard
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteIntoBodyPart}
                    className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                  >
                    ➕ Paste into Body Part
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCoordinatesModal(false)
                    setCapturedCoordinates(null)
                  }}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-slate-800 rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Body Part Selection Modal for Pasting Coordinates */}
        {showBodyPartSelectionModal && capturedCoordinates && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800">
                  Select Body Part
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowBodyPartSelectionModal(false)
                    setSelectedBodyPartForCoordinates(null)
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Select a body part to update with the captured camera coordinates:
                </p>
                
                <div className="mb-4">
                  <label className="block mb-2 text-slate-800 font-medium">
                    Body Part <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={selectedBodyPartForCoordinates || ''}
                    onChange={(e) => setSelectedBodyPartForCoordinates(parseInt(e.target.value))}
                  >
                    <option value="">Select a body part...</option>
                    {bodyParts.map((bp) => (
                      <option key={bp.id} value={bp.id}>
                        {bp.name}
                        {bp.cameraPositionJson && bp.cameraPositionJson.trim() && (
                          <span> (has position)</span>
                        )}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBodyPartForCoordinates && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
                    <div className="mb-2"><strong>Camera Coordinates:</strong></div>
                    <div className="ml-4 mb-2">Position: X: {capturedCoordinates.position.x}, Y: {capturedCoordinates.position.y}, Z: {capturedCoordinates.position.z}</div>
                    <div className="ml-4 mb-2">Rotation: X: {capturedCoordinates.rotation.x}°, Y: {capturedCoordinates.rotation.y}°, Z: {capturedCoordinates.rotation.z}°</div>
                    <div className="ml-4 mb-2">Distance: {capturedCoordinates.distance}</div>
                    {capturedCoordinates.zoomLevel && (
                      <div className="ml-4">Zoom Level: {capturedCoordinates.zoomLevel}%</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowBodyPartSelectionModal(false)
                    setSelectedBodyPartForCoordinates(null)
                  }}
                  disabled={isUpdatingBodyPartCoordinates}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateBodyPartCoordinates}
                  disabled={!selectedBodyPartForCoordinates || isUpdatingBodyPartCoordinates}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingBodyPartCoordinates ? 'Updating...' : 'Update Camera Position'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Body Parts List - Always Visible at Bottom */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">
              Or select from list:
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {bodyParts.map((bodyPart) => (
                <button
                  key={bodyPart.id}
                  onClick={() => {
                    // Always reset first to force state change detection
                    // This ensures CameraController will detect the change and animate
                    if (selectedBodyPart?.id === bodyPart.id) {
                      // If same body part, reset first to force re-animation
                      setSelectedBodyPart(null)
                      setShowExercises(false)
                      setExercises([])
                      
                      // Use requestAnimationFrame to ensure reset propagates before setting
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          setSelectedBodyPart(bodyPart)
                          setShowExercises(true)
                          loadExercises(bodyPart.id).catch(error => {
                            console.error('Error loading exercises:', error)
                          })
                        })
                      })
                    } else {
                      // Different body part - set directly
                    setSelectedBodyPart(bodyPart)
                      setShowExercises(true)
                      loadExercises(bodyPart.id).catch(error => {
                        console.error('Error loading exercises:', error)
                      })
                    }
                  }}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  selectedBodyPart?.id === bodyPart.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {bodyPart.name}
                {isAdmin && bodyPart.cameraPositionJson && bodyPart.cameraPositionJson.trim() && (
                  <span className="ml-2 text-xs opacity-75">📍</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Camera Position Modal for Admin */}
        {showCameraPositionModal && selectedBodyPart && currentCameraPosition && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">
                Save Camera Position
              </h3>
              <p className="text-gray-600 mb-4">
                Save the current camera position for <strong>{selectedBodyPart.name}</strong>?
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
                <div className="mb-2"><strong>Position:</strong></div>
                <div className="ml-4 mb-2">X: {currentCameraPosition.position.x.toFixed(2)}</div>
                <div className="ml-4 mb-2">Y: {currentCameraPosition.position.y.toFixed(2)}</div>
                <div className="ml-4 mb-4">Z: {currentCameraPosition.position.z.toFixed(2)}</div>
                
                <div className="mb-2"><strong>Rotation:</strong></div>
                <div className="ml-4 mb-2">X: {THREE.MathUtils.radToDeg(currentCameraPosition.rotation.x).toFixed(2)}°</div>
                <div className="ml-4 mb-2">Y: {THREE.MathUtils.radToDeg(currentCameraPosition.rotation.y).toFixed(2)}°</div>
                <div className="ml-4">Z: {THREE.MathUtils.radToDeg(currentCameraPosition.rotation.z).toFixed(2)}°</div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCameraPositionModal(false)}
                  disabled={isSavingPosition}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCameraPosition}
                  disabled={isSavingPosition}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingPosition ? 'Saving...' : 'Save Position'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scroll-container::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for IE, Edge and Firefox */
        .scroll-container {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </div>
  )
}

export default BodyPartsVisual

