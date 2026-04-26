import { useState, useEffect } from 'react'
import { bodyPartsApi } from '../services/api'
import { BodyPart } from '../types'
import Modal from '../components/Modal'

const BodyParts = () => {
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await bodyPartsApi.create(formData)
      setShowModal(false)
      setFormData({ name: '', description: '', imageUrl: '' })
      loadBodyParts()
    } catch (error) {
      console.error('Error creating body part:', error)
      alert('Error creating body part')
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this body part?')) {
      try {
        await bodyPartsApi.delete(id)
        loadBodyParts()
      } catch (error) {
        console.error('Error deleting body part:', error)
        alert('Error deleting body part')
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Body Parts</h2>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition-colors"
          onClick={() => setShowModal(true)}
        >
          Add Body Part
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-4 text-left border-b text-slate-800 font-semibold">ID</th>
              <th className="p-4 text-left border-b text-slate-800 font-semibold">Name</th>
              <th className="p-4 text-left border-b text-slate-800 font-semibold">Description</th>
              <th className="p-4 text-left border-b text-slate-800 font-semibold">Exercises</th>
              <th className="p-4 text-left border-b text-slate-800 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bodyParts.map((bodyPart) => (
              <tr key={bodyPart.id} className="hover:bg-gray-50">
                <td className="p-4 border-b">{bodyPart.id}</td>
                <td className="p-4 border-b font-medium">{bodyPart.name}</td>
                <td className="p-4 border-b">{bodyPart.description || '-'}</td>
                <td className="p-4 border-b">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                    {bodyPart.exerciseCount}
                  </span>
                </td>
                <td className="p-4 border-b">
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded text-sm transition-colors"
                    onClick={() => handleDelete(bodyPart.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Body Part">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block mb-2 text-slate-800 font-medium">Name *</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-slate-800 font-medium">Description</label>
            <textarea
              className="w-full p-3 border border-gray-300 rounded min-h-[100px] resize-y"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-slate-800 font-medium">Image URL</label>
            <input
              type="url"
              className="w-full p-3 border border-gray-300 rounded"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded transition-colors"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default BodyParts

