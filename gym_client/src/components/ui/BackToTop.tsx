import { useEffect, useState, useCallback } from 'react'
import gsap from 'gsap'
import { MagneticButton } from '../animated/MagneticButton'
import { getLocomotiveScrollInstance } from '../../lib/scrollInstance'

/**
 * Back to top button that appears after scrolling down
 */
export function BackToTop({ threshold = 300 }: { threshold?: number }) {
  const [visible, setVisible] = useState(false)

  const handleClick = useCallback(() => {
    // Use the global Locomotive Scroll instance if available (dashboard)
    const scrollInstance = getLocomotiveScrollInstance()
    if (scrollInstance) {
      scrollInstance.scrollTo(0)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    let ticking = false

    const checkScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || window.pageYOffset
          setVisible(scrollY > threshold)
          ticking = false
        })
        ticking = true
      }
    }

    // For Locomotive Scroll
    const scrollContainer = document.querySelector('[data-scroll-container]')
    if (scrollContainer) {
      // @ts-expect-error accessing internal instance
      const loco = scrollContainer.__locomotiveScroll
      if (loco) {
        const onScroll = () => {
          if (!ticking) {
            const scrollY = loco.scroll.instance.scroll.y
            setVisible(scrollY > threshold)
            ticking = false
          }
        }
        loco.on('scroll', onScroll)
        return () => {
          loco.off('scroll', onScroll)
        }
      }
    }

    window.addEventListener('scroll', checkScroll, { passive: true })
    checkScroll()

    return () => {
      window.removeEventListener('scroll', checkScroll)
    }
  }, [threshold])

  if (!visible) return null

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <MagneticButton
        onClick={handleClick}
        className="flex size-12 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg transition hover:bg-amber-400"
        aria-label="Back to top"
      >
        <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </MagneticButton>
    </div>
  )
}
