import { useEffect, useRef, ReactNode, CSSProperties } from 'react'
import gsap from 'gsap'

interface PageTransitionProps {
  children: ReactNode
  direction?: 'in' | 'out'
  duration?: number
  delay?: number
  className?: string
  style?: CSSProperties
}

/**
 * Wrapper component that provides fade-in/out page transitions
 */
export function PageTransition({
  children,
  direction = 'in',
  duration = 0.5,
  delay = 0,
  className = '',
  style = {},
}: PageTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    if (direction === 'in') {
      gsap.fromTo(element,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: 'power2.out',
        }
      )
    } else {
      gsap.to(element, {
        opacity: 0,
        y: -20,
        duration,
        delay,
        ease: 'power2.in',
        onComplete: () => {
          // Optional: unmount after animation
        },
      })
    }

    return () => {
      gsap.killTweensOf(element)
    }
  }, [direction, duration, delay])

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
    >
      {children}
    </div>
  )
}
