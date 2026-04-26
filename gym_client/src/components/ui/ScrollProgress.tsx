import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Adds a scroll progress bar at the top of the page
 * Call this component once at the root level
 */
export function ScrollProgress({ color = '#f59e0b', height = 3 }: { color?: string; height?: number }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    // Create the progress bar element
    const bar = document.createElement('div')
    bar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0%;
      height: ${height}px;
      background: ${color};
      z-index: 9999;
      pointer-events: none;
      transform-origin: left;
    `
    document.body.prepend(bar)

    const updateProgress = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = (scrollTop / docHeight) * 100
      bar.style.width = `${progress}%`
    }

    // Use GSAP quickSetter for smoother updates
    const setWidth = gsap.quickSetter(bar, 'width')

    const onScroll = () => {
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
        setWidth(`${progress}%`)
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // Initial call

    return () => {
      window.removeEventListener('scroll', onScroll)
      bar.remove()
    }
  }, [color, height])

  return null
}
