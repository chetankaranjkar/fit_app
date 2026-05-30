import { useEffect, useState } from 'react'

const WHATSAPP_NUMBER = '919999999999' // placeholder — replace with real number
const DEFAULT_MESSAGE = encodeURIComponent(
  "Hi Tiger Fitness! I'm interested in joining. Can you share the next available trial slot?"
)

export function WhatsAppFloatingCTA() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${DEFAULT_MESSAGE}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Tiger Fitness on WhatsApp"
      className={`fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_40px_-8px_rgba(37,211,102,0.6)] transition-all duration-300 hover:scale-105 active:scale-95 sm:bottom-8 sm:right-8 sm:px-5 sm:py-3.5 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
      }`}
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-30" />
      <svg viewBox="0 0 24 24" className="relative size-5" fill="currentColor">
        <path d="M17.6 6.32A7.92 7.92 0 0012.06 4h-.01a7.94 7.94 0 00-6.88 11.88L4 20l4.26-1.12a7.94 7.94 0 003.8.97h.01c4.38 0 7.94-3.56 7.94-7.94a7.88 7.88 0 00-2.41-5.59zm-5.54 12.2h-.01a6.6 6.6 0 01-3.36-.92l-.24-.14-2.53.66.68-2.46-.16-.25a6.6 6.6 0 1112.26-3.46 6.6 6.6 0 01-6.64 6.57zm3.61-4.94c-.2-.1-1.18-.58-1.36-.65-.18-.07-.32-.1-.45.1-.13.2-.52.65-.63.78-.12.13-.23.15-.43.05-.2-.1-.84-.31-1.6-.99-.59-.53-.99-1.18-1.1-1.38-.12-.2-.01-.3.09-.4.1-.1.2-.23.3-.35.1-.12.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.45-1.08-.61-1.48-.16-.39-.33-.34-.45-.34l-.38-.01a.73.73 0 00-.53.25c-.18.2-.7.68-.7 1.66s.71 1.92.81 2.05c.1.13 1.4 2.13 3.38 2.99.47.2.84.33 1.13.42.48.15.91.13 1.25.08.38-.06 1.18-.48 1.35-.95.17-.47.17-.87.12-.95-.05-.08-.18-.13-.38-.23z" />
      </svg>
      <span className="relative hidden sm:inline">Chat on WhatsApp</span>
    </a>
  )
}
