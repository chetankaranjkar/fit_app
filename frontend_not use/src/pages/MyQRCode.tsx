import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import QRCode from 'qrcode'

const MyQRCode = () => {
  const { user } = useAuth()
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const generateQRCode = async () => {
      if (!user?.userId) {
        setLoading(false)
        return
      }

      try {
        // Generate QR code with format: GYM_USER_{userId}
        const qrData = `GYM_USER_${user.userId}`
        const dataUrl = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        })
        setQrCodeDataUrl(dataUrl)
      } catch (error) {
        console.error('Error generating QR code:', error)
      } finally {
        setLoading(false)
      }
    }

    generateQRCode()
  }, [user])

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return

    const link = document.createElement('a')
    link.download = `gym-qr-code-${user?.userId || 'user'}.png`
    link.href = qrCodeDataUrl
    link.click()
  }

  if (!user?.userId) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center py-12 text-gray-500">
          <p>User ID not found. Please log in again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">My QR Code</h2>
        <p className="text-gray-600 mt-1">
          Show this QR code at the gym to check in quickly
        </p>
      </div>

      <div className="flex flex-col items-center">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : qrCodeDataUrl ? (
          <>
            <div className="bg-white p-6 rounded-lg shadow-lg border-4 border-gray-200 mb-6">
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                className="w-64 h-64 mx-auto"
              />
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 mb-2">User ID: {user.userId}</p>
              <p className="text-sm text-gray-500">{user.fullName}</p>
            </div>

            <button
              onClick={downloadQRCode}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>Download QR Code</span>
            </button>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Failed to generate QR code. Please try again.</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 w-full max-w-md p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-slate-800 mb-2">How to use:</h3>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Show this QR code to gym staff or scan it at the check-in station</li>
            <li>You can download it to your phone for easy access</li>
            <li>This QR code is unique to your account</li>
            <li>Keep it secure and don't share it with others</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default MyQRCode

