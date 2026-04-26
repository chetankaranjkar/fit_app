import { useState, useEffect, useRef } from 'react'
import { usersApi, bodyMetricsApi, fileUploadApi } from '../services/api'
import { User, UserDetail, BodyMetrics } from '../types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import BodyMetricGrid from '../components/BodyMetricGrid'

const Users = () => {
  const [users, setUsers] = useState<User[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showBodyMetricsModal, setShowBodyMetricsModal] = useState(false)
  const [showGraphModal, setShowGraphModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedUser, setSelectedUser] = useState<number | null>(null)
  const [selectedUserForMetrics, setSelectedUserForMetrics] = useState<User | null>(null)
  const [selectedUserForGraph, setSelectedUserForGraph] = useState<User | null>(null)
  const [userDetails, setUserDetails] = useState<UserDetail[]>([])
  const [bodyMetricsHistory, setBodyMetricsHistory] = useState<BodyMetrics[]>([])
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
    dateOfBirth: '',
    gender: 'Male',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    preferredGymTime: '',
    isActive: true,
    username: '',
    password: '',
  })
  const [detailFormData, setDetailFormData] = useState({
    userId: 0,
    height: '',
    weight: '',
    bodyFatPercentage: '',
    muscleMass: '',
    targetWeight: '',
    goalType: '',
    activityLevel: '',
    notes: '',
  })
  const [bodyMetricsFormData, setBodyMetricsFormData] = useState({
    userId: 0,
    measurementDate: new Date().toISOString().split('T')[0],
    weightKg: '',
    bodyFatPct: '',
    muscleMassKg: '',
    heightCm: '',
    neckCm: '',
    chestCm: '',
    waistCm: '',
    hipsCm: '',
    bicepsCm: '',
    forearmsCm: '',
    thighsCm: '',
    calvesCm: '',
    shouldersCm: '',
    notes: '',
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await usersApi.getAll()
      console.log('Loaded users:', response.data)
      // Log profile picture URLs
      response.data.forEach((user: User) => {
        if (user.profilePictureUrl) {
          console.log(`User ${user.id} (${user.firstName} ${user.lastName}) has profile picture:`, user.profilePictureUrl)
        }
      })
      setUsers(response.data)
    } catch (error) {
      console.error('Error loading users:', error)
      alert('Error loading users')
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
      dateOfBirth: '',
      gender: 'Male',
      address: '',
      emergencyContact: '',
      emergencyPhone: '',
      preferredGymTime: '',
      isActive: true,
      username: '',
      password: '',
    })
    setEditingUser(null)
    setProfileImageFile(null)
    setProfileImagePreview(null)
  }

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || 'Male',
        address: user.address || '',
        emergencyContact: user.emergencyContact || '',
        emergencyPhone: user.emergencyPhone || '',
        preferredGymTime: user.preferredGymTime || '',
        isActive: user.isActive ?? true,
        username: '',
        password: '',
      })
      setProfileImagePreview(user.profilePictureUrl ? `http://localhost:5104${user.profilePictureUrl}` : null)
    } else {
      resetForm()
      setProfileImagePreview(null)
    }
    setProfileImageFile(null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    resetForm()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      let userId: number
      
      if (editingUser) {
        // Update existing user
        const updateData = { ...formData }
        await usersApi.update(editingUser.id, updateData)
        userId = editingUser.id
        
        // Upload profile image if selected
        if (profileImageFile) {
          try {
            console.log('Uploading profile image for user:', userId)
            const uploadResponse = await fileUploadApi.uploadUserProfile(userId, profileImageFile)
            console.log('Upload response:', uploadResponse.data)
            const imageUrl = uploadResponse.data.imageUrl
            console.log('Image URL received:', imageUrl)
            const updateResponse = await usersApi.update(userId, { profilePictureUrl: imageUrl })
            console.log('User updated with image URL:', updateResponse.data)
          } catch (uploadError: any) {
            console.error('Error uploading profile image:', uploadError)
            console.error('Error details:', uploadError.response?.data)
            alert(`Error uploading image: ${uploadError.response?.data?.message || uploadError.message}`)
            // Continue even if image upload fails
          }
        }
      } else {
        // Create new user
        const createData = { ...formData }
        const response = await usersApi.create(createData)
        userId = response.data.id
        
        // Upload profile image if selected
        if (profileImageFile) {
          try {
            console.log('Uploading profile image for new user:', userId)
            const uploadResponse = await fileUploadApi.uploadUserProfile(userId, profileImageFile)
            console.log('Upload response:', uploadResponse.data)
            const imageUrl = uploadResponse.data.imageUrl
            console.log('Image URL received:', imageUrl)
            const updateResponse = await usersApi.update(userId, { profilePictureUrl: imageUrl })
            console.log('User updated with image URL:', updateResponse.data)
          } catch (uploadError: any) {
            console.error('Error uploading profile image:', uploadError)
            console.error('Error details:', uploadError.response?.data)
            alert(`Error uploading image: ${uploadError.response?.data?.message || uploadError.message}`)
            // Continue even if image upload fails
          }
        }
      }
      
      handleCloseModal()
      await loadUsers()
    } catch (error: any) {
      console.error('Error saving user:', error)
      const errorMessage = error.response?.data?.message || error.response?.data || 'Error saving user'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActiveStatus = async (user: User) => {
    const action = user.isActive ? 'discontinue' : 'reactivate'
    const confirmMessage = user.isActive 
      ? `Are you sure you want to discontinue ${user.firstName} ${user.lastName}?`
      : `Are you sure you want to reactivate ${user.firstName} ${user.lastName}?`
    
    if (confirm(confirmMessage)) {
      try {
        setLoading(true)
        await usersApi.update(user.id, { isActive: !user.isActive })
        loadUsers()
        alert(`User ${action === 'discontinue' ? 'discontinued' : 'reactivated'} successfully`)
      } catch (error) {
        console.error(`Error ${action}ing user:`, error)
        alert(`Error ${action}ing user`)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleViewDetails = async (userId: number) => {
    setSelectedUser(userId)
    setDetailFormData(prev => ({ ...prev, userId }))
    try {
      const response = await usersApi.getUserDetails(userId)
      setUserDetails(response.data)
      setShowDetailModal(true)
    } catch (error) {
      console.error('Error loading user details:', error)
    }
  }

  const handleAddDetail = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await usersApi.addUserDetail({
        ...detailFormData,
        height: parseFloat(detailFormData.height),
        weight: parseFloat(detailFormData.weight),
        bodyFatPercentage: detailFormData.bodyFatPercentage ? parseFloat(detailFormData.bodyFatPercentage) : null,
        muscleMass: detailFormData.muscleMass ? parseFloat(detailFormData.muscleMass) : null,
        targetWeight: detailFormData.targetWeight ? parseFloat(detailFormData.targetWeight) : null,
        goalType: detailFormData.goalType || null,
        activityLevel: detailFormData.activityLevel || null,
        notes: detailFormData.notes || null,
      })
      setDetailFormData({
        userId: selectedUser || 0,
        height: '',
        weight: '',
        bodyFatPercentage: '',
        muscleMass: '',
        targetWeight: '',
        goalType: '',
        activityLevel: '',
        notes: '',
      })
      if (selectedUser) {
        handleViewDetails(selectedUser)
      }
    } catch (error) {
      console.error('Error adding user detail:', error)
      alert('Error adding user detail')
    }
  }

  const handleOpenBodyMetricsModal = async (user: User) => {
    setSelectedUserForMetrics(user)
    setBodyMetricsFormData({
      userId: user.id,
      measurementDate: new Date().toISOString().split('T')[0],
      weightKg: '',
      bodyFatPct: '',
      muscleMassKg: '',
      heightCm: '',
      neckCm: '',
      chestCm: '',
      waistCm: '',
      hipsCm: '',
      bicepsCm: '',
      forearmsCm: '',
      thighsCm: '',
      calvesCm: '',
      shouldersCm: '',
      notes: '',
    })
    // Load body metrics history
    try {
      const response = await bodyMetricsApi.getByUser(user.id)
      setBodyMetricsHistory(response.data.sort((a, b) => 
        new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime()
      ))
    } catch (error) {
      console.error('Error loading body metrics history:', error)
      setBodyMetricsHistory([])
    }
    setShowBodyMetricsModal(true)
  }

  const handleOpenGraphModal = async (user: User) => {
    setSelectedUserForGraph(user)
    try {
      const response = await bodyMetricsApi.getByUser(user.id)
      const sortedMetrics = response.data.sort((a, b) => 
        new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime()
      )
      setBodyMetricsHistory(sortedMetrics)
      setShowGraphModal(true)
    } catch (error) {
      console.error('Error loading body metrics for graph:', error)
      alert('Error loading body metrics data')
    }
  }

  const handleCloseBodyMetricsModal = () => {
    setShowBodyMetricsModal(false)
    setSelectedUserForMetrics(null)
    setBodyMetricsHistory([])
  }

  const handleCloseGraphModal = () => {
    setShowGraphModal(false)
    setSelectedUserForGraph(null)
    setBodyMetricsHistory([])
  }

  const handleSubmitBodyMetrics = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const payload: any = {
        userId: bodyMetricsFormData.userId,
        date: bodyMetricsFormData.measurementDate,
        weightKg: parseFloat(bodyMetricsFormData.weightKg),
      }
      
      if (bodyMetricsFormData.bodyFatPct) payload.bodyFatPct = parseFloat(bodyMetricsFormData.bodyFatPct)
      if (bodyMetricsFormData.muscleMassKg) payload.muscleMassKg = parseFloat(bodyMetricsFormData.muscleMassKg)
      if (bodyMetricsFormData.heightCm) payload.heightCm = parseFloat(bodyMetricsFormData.heightCm)
      if (bodyMetricsFormData.neckCm) payload.neckCm = parseFloat(bodyMetricsFormData.neckCm)
      if (bodyMetricsFormData.chestCm) payload.chestCm = parseFloat(bodyMetricsFormData.chestCm)
      if (bodyMetricsFormData.waistCm) payload.waistCm = parseFloat(bodyMetricsFormData.waistCm)
      if (bodyMetricsFormData.hipsCm) payload.hipsCm = parseFloat(bodyMetricsFormData.hipsCm)
      if (bodyMetricsFormData.bicepsCm) payload.bicepsCm = parseFloat(bodyMetricsFormData.bicepsCm)
      if (bodyMetricsFormData.forearmsCm) payload.forearmsCm = parseFloat(bodyMetricsFormData.forearmsCm)
      if (bodyMetricsFormData.thighsCm) payload.thighsCm = parseFloat(bodyMetricsFormData.thighsCm)
      if (bodyMetricsFormData.calvesCm) payload.calvesCm = parseFloat(bodyMetricsFormData.calvesCm)
      if (bodyMetricsFormData.shouldersCm) payload.shouldersCm = parseFloat(bodyMetricsFormData.shouldersCm)
      if (bodyMetricsFormData.notes) payload.notes = bodyMetricsFormData.notes

      await bodyMetricsApi.create(payload)
      // Reload body metrics history
      if (selectedUserForMetrics) {
        const response = await bodyMetricsApi.getByUser(selectedUserForMetrics.id)
        setBodyMetricsHistory(response.data.sort((a, b) => 
          new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime()
        ))
      }
      // Reset form
      setBodyMetricsFormData({
        userId: bodyMetricsFormData.userId,
        measurementDate: new Date().toISOString().split('T')[0],
        weightKg: '',
        bodyFatPct: '',
        muscleMassKg: '',
        heightCm: '',
        neckCm: '',
        chestCm: '',
        waistCm: '',
        hipsCm: '',
        bicepsCm: '',
        forearmsCm: '',
        thighsCm: '',
        calvesCm: '',
        shouldersCm: '',
        notes: '',
      })
      alert('Body metrics added successfully!')
    } catch (error: any) {
      console.error('Error adding body metrics:', error)
      const errorMessage = error.response?.data?.message || error.response?.data || 'Error adding body metrics'
      alert(errorMessage)
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

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Users Management</h2>
          <p className="text-gray-600 mt-1">Manage gym members and their information</p>
        </div>
        <button
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold"
          onClick={() => handleOpenModal()}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Loading State */}
      {loading && users.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Users Table */}
      {!loading || users.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-gray-50">
                <th className="p-4 text-left border-b text-slate-800 font-semibold">ID</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Name</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Email</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Phone</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Gender</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Preferred Time</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Status</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Registration</th>
                <th className="p-4 text-left border-b text-slate-800 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    No users found. Click "Add User" to create one.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 border-b">{user.id}</td>
                    <td className="p-4 border-b">
                      <div className="flex items-center gap-3">
                        {user.profilePictureUrl ? (
                          <img
                            src={`http://localhost:5104${user.profilePictureUrl}`}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer hover:scale-125 transition-transform duration-200 shadow-md hover:shadow-lg"
                            onClick={() => setEnlargedImage({ 
                              url: `http://localhost:5104${user.profilePictureUrl}`, 
                              name: `${user.firstName} ${user.lastName}` 
                            })}
                            onError={(e) => {
                              console.error('Image failed to load:', user.profilePictureUrl, 'Full URL:', `http://localhost:5104${user.profilePictureUrl}`)
                              // Fallback to initials if image fails to load
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const parent = target.parentElement
                              if (parent) {
                                const fallback = document.createElement('div')
                                fallback.className = 'w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold'
                                fallback.textContent = `${user.firstName.charAt(0).toUpperCase()}${user.lastName.charAt(0).toUpperCase()}`
                                parent.appendChild(fallback)
                              }
                            }}
                            onLoad={() => console.log('Image loaded successfully:', user.profilePictureUrl)}
                          />
                        ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {user.firstName.charAt(0).toUpperCase()}
                          {user.lastName.charAt(0).toUpperCase()}
                        </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-800">
                            {user.firstName} {user.lastName}
                          </div>
                          {user.dateOfBirth && (
                            <div className="text-sm text-gray-500">
                              Age: {calculateAge(user.dateOfBirth)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 border-b">
                      <a
                        href={`mailto:${user.email}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {user.email}
                      </a>
                    </td>
                    <td className="p-4 border-b">
                      {user.phone ? (
                        <a
                          href={`tel:${user.phone}`}
                          className="text-gray-700 hover:text-blue-600"
                        >
                          {user.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 border-b">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        user.gender === 'Male' 
                          ? 'bg-blue-100 text-blue-800' 
                          : user.gender === 'Female'
                          ? 'bg-pink-100 text-pink-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.gender}
                      </span>
                    </td>
                    <td className="p-4 border-b">
                      {user.preferredGymTime ? (
                        <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                          {user.preferredGymTime}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 border-b">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 border-b text-gray-600">
                      {formatDate(user.registrationDate)}
                    </td>
                    <td className="p-4 border-b">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                          onClick={() => handleOpenModal(user)}
                          title="Edit User"
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
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                          onClick={() => handleViewDetails(user.id)}
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Details
                        </button>
                        <button
                          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                          onClick={() => handleOpenBodyMetricsModal(user)}
                          title="Add Body Metrics"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                          Body Metrics
                        </button>
                        <button
                          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                          onClick={() => handleOpenGraphModal(user)}
                          title="View Improvement Graph"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                          Graph
                        </button>
                        <button
                          className={`${
                            user.isActive
                              ? 'bg-orange-500 hover:bg-orange-600'
                              : 'bg-green-500 hover:bg-green-600'
                          } text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1`}
                          onClick={() => handleToggleActiveStatus(user)}
                          title={user.isActive ? 'Discontinue User' : 'Reactivate User'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {user.isActive ? (
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                              />
                            ) : (
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            )}
                          </svg>
                          {user.isActive ? 'Discontinue' : 'Reactivate'}
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

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">
                  {editingUser ? 'Edit User' : 'Add New User'}
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
              {/* Profile Image Upload Section */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <label className="block mb-3 text-slate-800 font-semibold">Profile Picture</label>
                <div className="flex items-center gap-6">
                  {/* Image Preview */}
                  <div className="flex-shrink-0">
                    {profileImagePreview ? (
                      <img
                        src={profileImagePreview}
                        alt="Profile preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-2xl font-semibold border-4 border-gray-200 shadow-md">
                        {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : '?'}
                        {formData.lastName ? formData.lastName.charAt(0).toUpperCase() : ''}
                      </div>
                    )}
                  </div>
                  
                  {/* Upload Button */}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="profileImageInput"
                    />
                    <label
                      htmlFor="profileImageInput"
                      className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 cursor-pointer font-semibold flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {profileImageFile || profileImagePreview ? 'Change Image' : 'Upload Image'}
                    </label>
                    {profileImageFile && (
                      <p className="text-sm text-gray-600 mt-2">
                        Selected: {profileImageFile.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Max file size: 5MB. Supported formats: JPG, PNG, GIF, WEBP
                    </p>
                  </div>
                </div>
              </div>

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
                    placeholder="user@example.com"
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

                {/* Date of Birth */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block mb-2 text-slate-800 font-semibold">Address</label>
                  <input
                    type="text"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address, City, State, ZIP"
                  />
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Emergency Contact</label>
                  <input
                    type="text"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="Contact name"
                  />
                </div>

                {/* Emergency Phone */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Emergency Phone</label>
                  <input
                    type="tel"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                {/* Preferred Gym Time */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Preferred Gym Time</label>
                  <select
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    value={formData.preferredGymTime}
                    onChange={(e) => setFormData({ ...formData, preferredGymTime: e.target.value })}
                  >
                    <option value="">Select time</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                  </select>
                </div>

                {/* Is Active (only for editing) */}
                {editingUser && (
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
                      Inactive users won't be available for scheduling
                    </p>
                  </div>
                )}

                {/* Account Credentials Section */}
                <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-2">
                  <h4 className="text-lg font-semibold text-slate-800 mb-4">Account Credentials (Optional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block mb-2 text-slate-800 font-semibold">Username</label>
                      <input
                        type="text"
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="Leave empty if no account needed"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-slate-800 font-semibold">Password</label>
                      <input
                        type="password"
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Leave empty if no account needed"
                      />
                    </div>
                  </div>
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
                      {editingUser ? 'Update User' : 'Create User'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">User Details & Measurements</h3>
                <button
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-colors"
                  onClick={() => setShowDetailModal(false)}
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

            {/* Add Measurement Form */}
            <div className="p-6 mb-8 border-b border-gray-200">
              <h4 className="text-xl font-semibold text-slate-800 mb-4">Add New Measurement</h4>
              <form onSubmit={handleAddDetail}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block mb-2 text-slate-800 font-semibold">
                      Height (cm) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                      value={detailFormData.height}
                      onChange={(e) => setDetailFormData({ ...detailFormData, height: e.target.value })}
                      placeholder="170.0"
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
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                      value={detailFormData.weight}
                      onChange={(e) => setDetailFormData({ ...detailFormData, weight: e.target.value })}
                      placeholder="70.0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block mb-2 text-slate-800 font-semibold">Body Fat %</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                      value={detailFormData.bodyFatPercentage}
                      onChange={(e) => setDetailFormData({ ...detailFormData, bodyFatPercentage: e.target.value })}
                      placeholder="15.0"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-slate-800 font-semibold">Muscle Mass (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                      value={detailFormData.muscleMass}
                      onChange={(e) => setDetailFormData({ ...detailFormData, muscleMass: e.target.value })}
                      placeholder="50.0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block mb-2 text-slate-800 font-semibold">Target Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                      value={detailFormData.targetWeight}
                      onChange={(e) => setDetailFormData({ ...detailFormData, targetWeight: e.target.value })}
                      placeholder="65.0"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-slate-800 font-semibold">Goal Type</label>
                    <select
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                      value={detailFormData.goalType}
                      onChange={(e) => setDetailFormData({ ...detailFormData, goalType: e.target.value })}
                    >
                      <option value="">Select Goal</option>
                      <option value="Weight Loss">Weight Loss</option>
                      <option value="Muscle Gain">Muscle Gain</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Body Recomposition">Body Recomposition</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 text-slate-800 font-semibold">Activity Level</label>
                    <select
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                      value={detailFormData.activityLevel}
                      onChange={(e) => setDetailFormData({ ...detailFormData, activityLevel: e.target.value })}
                    >
                      <option value="">Select Activity Level</option>
                      <option value="Sedentary">Sedentary</option>
                      <option value="Lightly Active">Lightly Active</option>
                      <option value="Moderately Active">Moderately Active</option>
                      <option value="Very Active">Very Active</option>
                      <option value="Extremely Active">Extremely Active</option>
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block mb-2 text-slate-800 font-semibold">Notes</label>
                  <textarea
                    rows={3}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors resize-none"
                    value={detailFormData.notes}
                    onChange={(e) => setDetailFormData({ ...detailFormData, notes: e.target.value })}
                    placeholder="Additional notes about this measurement..."
                  />
                </div>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Measurement
                </button>
              </form>
            </div>

            {/* Body Metrics Comparison Grid */}
            {selectedUser && (
              <div className="p-6 border-t border-gray-200">
                <BodyMetricGrid userId={selectedUser} />
              </div>
            )}

            {/* Measurement History */}
            <div className="p-6">
              <h4 className="text-xl font-semibold text-slate-800 mb-4">Measurement History</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
                      <th className="p-4 text-left border-b text-slate-800 font-semibold">Date</th>
                      <th className="p-4 text-left border-b text-slate-800 font-semibold">Height (cm)</th>
                      <th className="p-4 text-left border-b text-slate-800 font-semibold">Weight (kg)</th>
                      <th className="p-4 text-left border-b text-slate-800 font-semibold">Target (kg)</th>
                      <th className="p-4 text-left border-b text-slate-800 font-semibold">BMI</th>
                      <th className="p-4 text-left border-b text-slate-800 font-semibold">BMR</th>
                      <th className="p-4 text-left border-b text-slate-800 font-semibold">Goal</th>
                      <th className="p-4 text-left border-b text-slate-800 font-semibold">Activity</th>
                      <th className="p-4 text-left border-b text-slate-800 font-semibold">Body Fat %</th>
                      <th className="p-4 text-left border-b text-slate-800 font-semibold">Muscle Mass (kg)</th>
                      <th className="p-4 text-left border-b text-slate-800 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userDetails.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-gray-500">
                          No measurements recorded yet. Add a measurement above.
                        </td>
                      </tr>
                    ) : (
                      userDetails.map((detail) => (
                        <tr key={detail.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 border-b font-medium">
                            {formatDate(detail.measurementDate)}
                          </td>
                          <td className="p-4 border-b">{detail.height}</td>
                          <td className="p-4 border-b">{detail.weight}</td>
                          <td className="p-4 border-b">
                            {detail.targetWeight ? (
                              <span className="inline-block bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                                {detail.targetWeight.toFixed(1)} kg
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-4 border-b">
                            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                              {detail.bmi.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4 border-b">{detail.bmr.toFixed(2)}</td>
                          <td className="p-4 border-b">
                            {detail.goalType ? (
                              <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                                {detail.goalType}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-4 border-b">
                            {detail.activityLevel ? (
                              <span className="inline-block bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium">
                                {detail.activityLevel}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-4 border-b">
                            {detail.bodyFatPercentage ? (
                              <span className="inline-block bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
                                {detail.bodyFatPercentage.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-4 border-b">
                            {detail.muscleMass ? (
                              <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                {detail.muscleMass.toFixed(2)} kg
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-4 border-b">
                            {detail.notes ? (
                              <span className="text-sm text-gray-700 max-w-xs truncate block" title={detail.notes}>
                                {detail.notes}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Body Metrics Modal */}
      {showBodyMetricsModal && selectedUserForMetrics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">
                  Add Body Metrics - {selectedUserForMetrics.firstName} {selectedUserForMetrics.lastName}
                </h3>
                <button
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-colors"
                  onClick={handleCloseBodyMetricsModal}
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
            <form onSubmit={handleSubmitBodyMetrics} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date */}
                <div className="md:col-span-2">
                  <label className="block mb-2 text-slate-800 font-semibold">
                    Measurement Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.measurementDate}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, measurementDate: e.target.value })}
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">
                    Weight (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.weightKg}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, weightKg: e.target.value })}
                    placeholder="70.0"
                  />
                </div>

                {/* Height */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.heightCm}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, heightCm: e.target.value })}
                    placeholder="175.0"
                  />
                </div>

                {/* Body Fat % */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Body Fat %</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.bodyFatPct}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, bodyFatPct: e.target.value })}
                    placeholder="15.0"
                  />
                </div>

                {/* Muscle Mass */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Muscle Mass (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.muscleMassKg}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, muscleMassKg: e.target.value })}
                    placeholder="50.0"
                  />
                </div>

                {/* Neck */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Neck (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.neckCm}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, neckCm: e.target.value })}
                    placeholder="38.0"
                  />
                </div>

                {/* Chest */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Chest (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.chestCm}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, chestCm: e.target.value })}
                    placeholder="100.0"
                  />
                </div>

                {/* Waist */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Waist (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.waistCm}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, waistCm: e.target.value })}
                    placeholder="80.0"
                  />
                </div>

                {/* Hips */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Hips (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.hipsCm}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, hipsCm: e.target.value })}
                    placeholder="95.0"
                  />
                </div>

                {/* Biceps */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Biceps (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.bicepsCm}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, bicepsCm: e.target.value })}
                    placeholder="35.0"
                  />
                </div>

                {/* Forearms */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Forearms (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.forearmsCm}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, forearmsCm: e.target.value })}
                    placeholder="28.0"
                  />
                </div>

                {/* Thighs */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Thighs (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.thighsCm}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, thighsCm: e.target.value })}
                    placeholder="60.0"
                  />
                </div>

                {/* Calves */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Calves (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.calvesCm}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, calvesCm: e.target.value })}
                    placeholder="38.0"
                  />
                </div>

                {/* Shoulders */}
                <div>
                  <label className="block mb-2 text-slate-800 font-semibold">Shoulders (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                    value={bodyMetricsFormData.shouldersCm}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, shouldersCm: e.target.value })}
                    placeholder="110.0"
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block mb-2 text-slate-800 font-semibold">Notes</label>
                  <textarea
                    rows={3}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors resize-none"
                    value={bodyMetricsFormData.notes}
                    onChange={(e) => setBodyMetricsFormData({ ...bodyMetricsFormData, notes: e.target.value })}
                    placeholder="Additional notes about this measurement..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
                  onClick={handleCloseBodyMetricsModal}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      Add Body Metrics
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Body Metrics History Table */}
            {bodyMetricsHistory.length > 0 && (
              <div className="p-6 border-t border-gray-200 mt-6">
                <h4 className="text-xl font-semibold text-slate-800 mb-4">Body Metrics History</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
                        <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Date</th>
                        <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Weight (kg)</th>
                        <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Body Fat %</th>
                        <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Muscle Mass (kg)</th>
                        <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Chest</th>
                        <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Waist</th>
                        <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Hips</th>
                        <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Biceps</th>
                        <th className="p-3 text-left border-b text-slate-800 font-semibold text-sm">Thighs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bodyMetricsHistory.map((metric) => (
                        <tr key={metric.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 border-b text-sm">
                            {new Date(metric.measurementDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="p-3 border-b text-sm font-medium">{metric.weightKg.toFixed(1)}</td>
                          <td className="p-3 border-b text-sm">
                            {metric.bodyFatPct ? `${metric.bodyFatPct.toFixed(1)}%` : '-'}
                          </td>
                          <td className="p-3 border-b text-sm">
                            {metric.muscleMassKg ? `${metric.muscleMassKg.toFixed(1)}` : '-'}
                          </td>
                          <td className="p-3 border-b text-sm">
                            {metric.chestCm ? `${metric.chestCm.toFixed(1)} cm` : '-'}
                          </td>
                          <td className="p-3 border-b text-sm">
                            {metric.waistCm ? `${metric.waistCm.toFixed(1)} cm` : '-'}
                          </td>
                          <td className="p-3 border-b text-sm">
                            {metric.hipsCm ? `${metric.hipsCm.toFixed(1)} cm` : '-'}
                          </td>
                          <td className="p-3 border-b text-sm">
                            {metric.bicepsCm ? `${metric.bicepsCm.toFixed(1)} cm` : '-'}
                          </td>
                          <td className="p-3 border-b text-sm">
                            {metric.thighsCm ? `${metric.thighsCm.toFixed(1)} cm` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Graph Modal */}
      {showGraphModal && selectedUserForGraph && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">
                  Body Metrics Improvement - {selectedUserForGraph.firstName} {selectedUserForGraph.lastName}
                </h3>
                <button
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-colors"
                  onClick={handleCloseGraphModal}
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
            <div className="p-6">
              {bodyMetricsHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No body metrics data available to display.</p>
                  <p className="text-sm mt-2">Add body metrics to see improvement trends.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Weight Trend */}
                  {bodyMetricsHistory.some(m => m.weightKg) && (
                    <div>
                      <h4 className="text-lg font-semibold text-slate-800 mb-4">Weight Trend (kg)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={bodyMetricsHistory.map(m => ({
                          date: new Date(m.measurementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                          weight: m.weightKg,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Body Fat & Muscle Mass */}
                  {(bodyMetricsHistory.some(m => m.bodyFatPct) || bodyMetricsHistory.some(m => m.muscleMassKg)) && (
                    <div>
                      <h4 className="text-lg font-semibold text-slate-800 mb-4">Body Composition</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={bodyMetricsHistory.map(m => ({
                          date: new Date(m.measurementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                          bodyFat: m.bodyFatPct || null,
                          muscleMass: m.muscleMassKg || null,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          {bodyMetricsHistory.some(m => m.bodyFatPct) && (
                            <Line yAxisId="left" type="monotone" dataKey="bodyFat" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} name="Body Fat %" />
                          )}
                          {bodyMetricsHistory.some(m => m.muscleMassKg) && (
                            <Line yAxisId="right" type="monotone" dataKey="muscleMass" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Muscle Mass (kg)" />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Body Measurements */}
                  {(bodyMetricsHistory.some(m => m.chestCm) || bodyMetricsHistory.some(m => m.waistCm) || 
                    bodyMetricsHistory.some(m => m.hipsCm) || bodyMetricsHistory.some(m => m.bicepsCm) ||
                    bodyMetricsHistory.some(m => m.thighsCm)) && (
                    <div>
                      <h4 className="text-lg font-semibold text-slate-800 mb-4">Body Measurements (cm)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={bodyMetricsHistory.map(m => ({
                          date: new Date(m.measurementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                          chest: m.chestCm || null,
                          waist: m.waistCm || null,
                          hips: m.hipsCm || null,
                          biceps: m.bicepsCm || null,
                          thighs: m.thighsCm || null,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {bodyMetricsHistory.some(m => m.chestCm) && (
                            <Line type="monotone" dataKey="chest" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Chest" />
                          )}
                          {bodyMetricsHistory.some(m => m.waistCm) && (
                            <Line type="monotone" dataKey="waist" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Waist" />
                          )}
                          {bodyMetricsHistory.some(m => m.hipsCm) && (
                            <Line type="monotone" dataKey="hips" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Hips" />
                          )}
                          {bodyMetricsHistory.some(m => m.bicepsCm) && (
                            <Line type="monotone" dataKey="biceps" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Biceps" />
                          )}
                          {bodyMetricsHistory.some(m => m.thighsCm) && (
                            <Line type="monotone" dataKey="thighs" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Thighs" />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Improvement Summary */}
                  {bodyMetricsHistory.length >= 2 && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold text-slate-800 mb-4">Improvement Summary</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {bodyMetricsHistory[0].weightKg && bodyMetricsHistory[bodyMetricsHistory.length - 1].weightKg && (
                          <div className="bg-white p-4 rounded-lg shadow">
                            <p className="text-sm text-gray-600">Weight Change</p>
                            <p className={`text-2xl font-bold ${
                              bodyMetricsHistory[bodyMetricsHistory.length - 1].weightKg < bodyMetricsHistory[0].weightKg
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {bodyMetricsHistory[bodyMetricsHistory.length - 1].weightKg > bodyMetricsHistory[0].weightKg ? '+' : ''}
                              {(bodyMetricsHistory[bodyMetricsHistory.length - 1].weightKg - bodyMetricsHistory[0].weightKg).toFixed(1)} kg
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {bodyMetricsHistory[0].weightKg.toFixed(1)} kg → {bodyMetricsHistory[bodyMetricsHistory.length - 1].weightKg.toFixed(1)} kg
                            </p>
                          </div>
                        )}
                        {bodyMetricsHistory[0].bodyFatPct && bodyMetricsHistory[bodyMetricsHistory.length - 1].bodyFatPct && (
                          <div className="bg-white p-4 rounded-lg shadow">
                            <p className="text-sm text-gray-600">Body Fat Change</p>
                            <p className={`text-2xl font-bold ${
                              bodyMetricsHistory[bodyMetricsHistory.length - 1].bodyFatPct < bodyMetricsHistory[0].bodyFatPct
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {bodyMetricsHistory[bodyMetricsHistory.length - 1].bodyFatPct > bodyMetricsHistory[0].bodyFatPct ? '+' : ''}
                              {(bodyMetricsHistory[bodyMetricsHistory.length - 1].bodyFatPct - bodyMetricsHistory[0].bodyFatPct).toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {bodyMetricsHistory[0].bodyFatPct.toFixed(1)}% → {bodyMetricsHistory[bodyMetricsHistory.length - 1].bodyFatPct.toFixed(1)}%
                            </p>
                          </div>
                        )}
                        {bodyMetricsHistory[0].muscleMassKg && bodyMetricsHistory[bodyMetricsHistory.length - 1].muscleMassKg && (
                          <div className="bg-white p-4 rounded-lg shadow">
                            <p className="text-sm text-gray-600">Muscle Mass Change</p>
                            <p className={`text-2xl font-bold ${
                              bodyMetricsHistory[bodyMetricsHistory.length - 1].muscleMassKg > bodyMetricsHistory[0].muscleMassKg
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {bodyMetricsHistory[bodyMetricsHistory.length - 1].muscleMassKg > bodyMetricsHistory[0].muscleMassKg ? '+' : ''}
                              {(bodyMetricsHistory[bodyMetricsHistory.length - 1].muscleMassKg - bodyMetricsHistory[0].muscleMassKg).toFixed(1)} kg
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {bodyMetricsHistory[0].muscleMassKg.toFixed(1)} kg → {bodyMetricsHistory[bodyMetricsHistory.length - 1].muscleMassKg.toFixed(1)} kg
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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

export default Users
