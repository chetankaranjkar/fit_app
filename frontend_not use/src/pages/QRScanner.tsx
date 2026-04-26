import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { attendanceLogsApi } from '../services/api'

const QRScanner = () => {
    const [scanning, setScanning] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [loading, setLoading] = useState(false)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const scannerContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        return () => {
            // Cleanup scanner on unmount
            if (scannerRef.current) {
                scannerRef.current
                    .stop()
                    .then(() => {
                        scannerRef.current = null
                    })
                    .catch((err) => {
                        console.error('Error stopping scanner:', err)
                    })
            }
        }
    }, [])

    const startScanning = async () => {
        try {
            setMessage(null)
            setScanning(true)
            setLoading(true)

            const scanner = new Html5Qrcode('qr-reader')
            scannerRef.current = scanner

            await scanner.start(
                {
                    facingMode: 'environment', // Use back camera
                },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    handleQRCodeScanned(decodedText)
                },
                () => {
                    // Ignore scanning errors (they're frequent during scanning)
                }
            )

            setLoading(false)
        } catch (error: any) {
            console.error('Error starting scanner:', error)
            setMessage({
                type: 'error',
                text: error.message || 'Failed to start camera. Please check permissions.',
            })
            setScanning(false)
            setLoading(false)
        }
    }

    const stopScanning = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop()
                scannerRef.current.clear()
                scannerRef.current = null
            } catch (error) {
                console.error('Error stopping scanner:', error)
            }
        }
        setScanning(false)
    }

    const handleQRCodeScanned = async (decodedText: string) => {
        try {
            // Stop scanning immediately to prevent multiple scans
            await stopScanning()

            // Parse the QR code - format: GYM_USER_{userId} or just {userId}
            let userId: number | null = null

            if (decodedText.startsWith('GYM_USER_')) {
                userId = parseInt(decodedText.replace('GYM_USER_', ''), 10)
            } else if (!isNaN(parseInt(decodedText, 10))) {
                userId = parseInt(decodedText, 10)
            } else {
                setMessage({
                    type: 'error',
                    text: 'Invalid QR code format. Please scan a valid gym QR code.',
                })
                return
            }

            if (!userId || userId <= 0) {
                setMessage({
                    type: 'error',
                    text: 'Invalid user ID in QR code.',
                })
                return
            }

            setLoading(true)

            // Check in the user
            await attendanceLogsApi.checkIn({
                userId: userId,
                checkInMethod: 'QR Code',
            })

            setMessage({
                type: 'success',
                text: `Successfully checked in user ID: ${userId}`,
            })

            // Clear message after 3 seconds
            setTimeout(() => {
                setMessage(null)
            }, 3000)
        } catch (error: any) {
            console.error('Error checking in:', error)
            const errorMessage =
                error.response?.data?.message || 'Failed to check in. Please try again.'
            setMessage({
                type: 'error',
                text: errorMessage,
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-8">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-800">QR Code Scanner</h2>
                <p className="text-gray-600 mt-1">Scan a QR code to check in a member</p>
            </div>

            {/* Message Display */}
            {message && (
                <div
                    className={`mb-6 p-4 rounded-lg ${message.type === 'success'
                        ? 'bg-green-50 border-2 border-green-200 text-green-800'
                        : 'bg-red-50 border-2 border-red-200 text-red-800'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        {message.type === 'success' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        )}
                        <span className="font-semibold">{message.text}</span>
                    </div>
                </div>
            )}

            {/* Scanner Container */}
            <div className="mb-6">
                <div
                    id="qr-reader"
                    ref={scannerContainerRef}
                    className="w-full max-w-md mx-auto rounded-lg overflow-hidden border-4 border-gray-300 min-h-[300px]"
                ></div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
                {!scanning ? (
                    <button
                        onClick={startScanning}
                        disabled={loading}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Starting...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                                    />
                                </svg>
                                <span>Start Scanning</span>
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={stopScanning}
                        disabled={loading}
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                            />
                        </svg>
                        <span>Stop Scanning</span>
                    </button>
                )}
            </div>

            {/* Instructions */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-slate-800 mb-2">Instructions:</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Click "Start Scanning" to activate your camera</li>
                    <li>Point your camera at a gym member's QR code</li>
                    <li>The system will automatically check them in when the code is scanned</li>
                    <li>Make sure you have camera permissions enabled</li>
                </ul>
            </div>
        </div>
    )
}

export default QRScanner

