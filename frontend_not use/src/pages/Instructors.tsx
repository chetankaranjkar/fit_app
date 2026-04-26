import { useState, useEffect, useRef } from 'react'
import { instructorsApi, fileUploadApi } from '../services/api'
import { Instructor } from '../types'

const Instructors = () => {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null)
  const [loading, setLoading] = useState(false)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; name: string } | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    bio: '',
    profilePicture: '',
    isActive: true,
  })

  useEffect(() => {
    loadInstructors()
  }, [])

  const loadInstructors = async () => {
    try {
      setLoading(true)
      const response = await instructorsApi.getAll()
      setInstructors(response.data)
    } catch (error) {
      console.error('Error loading instructors:', error)
      alert('Error loading instructors')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      specialization: '',
      bio: '',
      profilePicture: '',
      isActive: true,
    })
    setProfileImageFile(null)
    setProfileImagePreview(null)
    setEditingInstructor(null)
  }

  const handleOpenModal = (instructor?: Instructor) => {
    if (instructor) {
      setEditingInstructor(instructor)
      setFormData({
        firstName: instructor.firstName,
        lastName: instructor.lastName,
        email: instructor.email,
        phone: instructor.phone || '',
        specialization: instructor.specialization || '',
        bio: instructor.bio || '',
        profilePicture: instructor.profilePicture || '',
        isActive: instructor.isActive,
      })
      // Set image preview if profile picture exists
      if (instructor.profilePicture) {
        setProfileImagePreview(`http://localhost:5104${instructor.profilePicture}`)
      } else {
        setProfileImagePreview(null)
      }
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
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
      let instructorId: number
      
      if (editingInstructor) {
        // Update existing instructor
        const updateData = { ...formData }
        await instructorsApi.update(editingInstructor.id, updateData)
        instructorId = editingInstructor.id
        
        // Upload profile image if selected
        if (profileImageFile) {
          try {
            console.log('Uploading profile image for instructor:', instructorId)
            const uploadResponse = await fileUploadApi.uploadInstructorProfile(instructorId, profileImageFile)
            console.log('Upload response:', uploadResponse.data)
            const imageUrl = uploadResponse.data.imageUrl
            console.log('Image URL received:', imageUrl)
            const updateResponse = await instructorsApi.update(instructorId, { profilePicture: imageUrl })
            console.log('Instructor updated with image URL:', updateResponse.data)
          } catch (uploadError: any) {
            console.error('Error uploading profile image:', uploadError)
            console.error('Error details:', uploadError.response?.data)
            alert(`Error uploading image: ${uploadError.response?.data?.message || uploadError.message}`)
            // Continue even if image upload fails
          }
        }
      } else {
        // Create new instructor
        const createData = { ...formData }
        const response = await instructorsApi.create(createData)
        instructorId = response.data.id
        
        // Upload profile image if selected
        if (profileImageFile) {
          try {
            console.log('Uploading profile image for new instructor:', instructorId)
            const uploadResponse = await fileUploadApi.uploadInstructorProfile(instructorId, profileImageFile)
            console.log('Upload response:', uploadResponse.data)
            const imageUrl = uploadResponse.data.imageUrl
            console.log('Image URL received:', imageUrl)
            const updateResponse = await instructorsApi.update(instructorId, { profilePicture: imageUrl })
            console.log('Instructor updated with image URL:', updateResponse.data)
          } catch (uploadError: any) {
            console.error('Error uploading profile image:', uploadError)
            console.error('Error details:', uploadError.response?.data)
            alert(`Error uploading image: ${uploadError.response?.data?.message || uploadError.message}`)
            // Continue even if image upload fails
          }
        }
      }
      
      handleCloseModal()
      await loadInstructors()
    } catch (error: any) {
      console.error('Error saving instructor:', error)
      const errorMessage = error.response?.data?.message || error.response?.data || 'Error saving instructor'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this instructor?')) {
      try {
        setLoading(true)
        await instructorsApi.delete(id)
        loadInstructors()
      } catch (error) {
        console.error('Error deleting instructor:', error)
        alert('Error deleting instructor')
      } finally {
        setLoading(false)
      }
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
          <h2 className="text-3xl font-bold text-slate-800">Instructors Management</h2>
          <p className="text-gray-600 mt-1">Manage gym instructors and their information</p>
        </div>
        <button
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold"
          onClick={() => handleOpenModal()}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Instructor
        </button>
      </div>

      {/* Loading State */}
      {loading && instructors.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Instructors Table */}
      {!loading || instructors.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-gray-50">
                <th className="p-4 text-left border-b text-slate-800 font-semibold">ID</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Name</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Email</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Phone</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Specialization</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Hire Date</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Status</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {instructors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    No instructors found. Click "Add Instructor" to create one.
                  </td>
                </tr>
              ) : (
                instructors.map((instructor) => (
                  <tr key={instructor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 border-b">{instructor.id}</td>
                    <td className="p-4 border-b">
                      <div className="flex items-center gap-3">
                        {instructor.profilePicture ? (
                          <img
                            src={`http://localhost:5104${instructor.profilePicture}`}
                            alt={`${instructor.firstName} ${instructor.lastName}`}
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer hover:scale-125 transition-transform duration-200 shadow-md hover:shadow-lg"
                            onClick={() => setEnlargedImage({ 
                              url: `http://localhost:5104${instructor.profilePicture}`, 
                              name: `${instructor.firstName} ${instructor.lastName}` 
                            })}
                            onError={(e) => {
                              console.error('Image failed to load:', instructor.profilePicture)
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const parent = target.parentElement
                              if (parent) {
                                const fallback = document.createElement('div')
                                fallback.className = 'w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold'
                                fallback.textContent = `${instructor.firstName.charAt(0).toUpperCase()}${instructor.lastName.charAt(0).toUpperCase()}`
                                parent.appendChild(fallback)
                              }
                            }}
                            onLoad={() => console.log('Image loaded successfully:', instructor.profilePicture)}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {instructor.firstName.charAt(0).toUpperCase()}
                            {instructor.lastName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-800">
                            {instructor.firstName} {instructor.lastName}
                          </div>
                          {instructor.bio && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{instructor.bio}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 border-b">
                      <a
                        href={`mailto:${instructor.email}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {instructor.email}
                      </a>
                    </td>
                    <td className="p-4 border-b">
                      {instructor.phone ? (
                        <a
                          href={`tel:${instructor.phone}`}
                          className="text-gray-700 hover:text-blue-600"
                        >
                          {instructor.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 border-b">
                      {instructor.specialization ? (
                        <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {instructor.specialization}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 border-b text-gray-600">{formatDate(instructor.hireDate)}</td>
                    <td className="p-4 border-b">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          instructor.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {instructor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 border-b">
                      <div className="flex gap-2">
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                          onClick={() => handleOpenModal(instructor)}
                          title="Edit Instructor"
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
                        <button
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                          onClick={() => handleDelete(instructor.id)}
                          title="Delete Instructor"
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">
                  {editingInstructor ? 'Edit Instructor' : 'Add New Instructor'}
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
                {/* First Name */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="instructor@example.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Phone</label>
                  <input
                    type="tel"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                {/* Specialization */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Specialization</label>
                  <input
                    type="text"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="e.g., Strength Training, Yoga, Cardio"
                  />
                </div>

                {/* Profile Picture */}
                <div className="md:col-span-2">
                  <label className="block mb-2 text-slate-800 font-semibold">Profile Picture</label>
                  <div className="flex items-start gap-4">
                    {profileImagePreview && (
                      <div className="relative">
                        <img
                          src={profileImagePreview}
                          alt="Profile preview"
                          className="w-24 h-24 rounded-full object-cover border-2 border-gray-300 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setProfileImagePreview(null)
                            setProfileImageFile(null)
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {profileImagePreview ? 'Change Image' : 'Upload Image'}
                      </button>
                      <p className="text-sm text-gray-500 mt-2">
                        Supported formats: JPG, PNG, GIF, WEBP (Max 5MB)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="md:col-span-2">
                  <label className="block mb-2 text-slate-800 font-semibold">Bio</label>
                  <textarea
                    rows={4}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors resize-none"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us about the instructor's background, experience, and expertise..."
                  />
                </div>

                {/* Is Active (only for editing) */}
                {editingInstructor && (
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                      <span className="text-slate-800 font-semibold">Active Status</span>
                    </label>
                    <p className="text-sm text-gray-500 mt-1 ml-8">
                      Inactive instructors won't be available for assignment
                    </p>
                  </div>
                )}
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
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      {editingInstructor ? 'Update Instructor' : 'Create Instructor'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enlarged Image Modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <div className="bg-white rounded-lg p-4 shadow-2xl relative">
              <button
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors z-10 shadow-lg"
                onClick={(e) => {
                  e.stopPropagation()
                  setEnlargedImage(null)
                }}
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center pr-10">
                {enlargedImage.name}
              </h3>
              <img
                src={enlargedImage.url}
                alt={enlargedImage.name}
                className="w-full h-auto rounded-lg object-contain max-h-[70vh]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Instructors
