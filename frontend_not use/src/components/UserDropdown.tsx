import { useState, useEffect, useRef } from 'react'
import { usersApi } from '../services/api'
import { User } from '../types'

interface UserDropdownProps {
  selectedUserId: number | null
  onUserSelect: (userId: number | null) => void
  placeholder?: string
  className?: string
}

const UserDropdown = ({ 
  selectedUserId, 
  onUserSelect, 
  placeholder = "Search user...",
  className = ""
}: UserDropdownProps) => {
  const [users, setUsers] = useState<User[]>([])
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isUserSelected, setIsUserSelected] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const prevSelectedUserIdRef = useRef<number | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    // Only update search term when selectedUserId actually changes (not on every render)
    if (prevSelectedUserIdRef.current !== selectedUserId) {
      prevSelectedUserIdRef.current = selectedUserId
      
      if (selectedUserId) {
        const selectedUser = users.find(u => u.id === selectedUserId)
        if (selectedUser) {
          const fullName = `${selectedUser.firstName} ${selectedUser.lastName}`
          setUserSearchTerm(fullName)
          setIsUserSelected(true)
        }
        // If user not found in list yet, keep current search term (users might still be loading)
      } else {
        // Only clear when explicitly set to null from parent
        setUserSearchTerm('')
        setIsUserSelected(false)
      }
    }
  }, [selectedUserId, users])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await usersApi.getAll()
      setUsers(response.data)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter users for searchable dropdown
  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
    const email = user.email.toLowerCase()
    const searchTerm = userSearchTerm.toLowerCase()
    return fullName.includes(searchTerm) || email.includes(searchTerm)
  })

  const handleUserSelect = (user: User) => {
    const fullName = `${user.firstName} ${user.lastName}`
    setUserSearchTerm(fullName)
    setIsUserSelected(true)
    onUserSelect(user.id)
    setShowUserDropdown(false)
  }

  const handleClear = () => {
    onUserSelect(null)
    setUserSearchTerm('')
    setIsUserSelected(false)
    setShowUserDropdown(false)
  }

  const selectedUser = users.find(u => u.id === selectedUserId)

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          className="px-4 py-2 pr-10 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none w-64"
          placeholder={placeholder}
          value={userSearchTerm}
          onChange={(e) => {
            const newValue = e.target.value
            setUserSearchTerm(newValue)
            setShowUserDropdown(true)
            // Only clear selection if user manually clears the input completely
            if (!newValue.trim()) {
              onUserSelect(null)
              setIsUserSelected(false)
            }
            // Allow user to type and search without clearing selection
            // Selection will be updated when they click on a user from dropdown
          }}
          onFocus={() => setShowUserDropdown(true)}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {selectedUserId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <svg
            className="w-5 h-5 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      {showUserDropdown && filteredUsers.length > 0 && (
        <div className="absolute z-50 w-64 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className={`flex items-center gap-3 px-4 py-2 hover:bg-blue-50 cursor-pointer ${
                selectedUserId === u.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => handleUserSelect(u)}
            >
              {u.profilePictureUrl ? (
                <img
                  src={`http://localhost:5104${u.profilePictureUrl}`}
                  alt={`${u.firstName} ${u.lastName}`}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      const fallback = document.createElement('div')
                      fallback.className = 'w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-semibold'
                      fallback.textContent = `${u.firstName.charAt(0).toUpperCase()}${u.lastName.charAt(0).toUpperCase()}`
                      parent.appendChild(fallback)
                    }
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                  {u.firstName.charAt(0).toUpperCase()}
                  {u.lastName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="font-medium text-slate-800">
                  {u.firstName} {u.lastName}
                </div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showUserDropdown && userSearchTerm && filteredUsers.length === 0 && (
        <div className="absolute z-50 w-64 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No users found
        </div>
      )}
    </div>
  )
}

export default UserDropdown

