import { useEffect, useRef, ReactNode, HTMLAttributes } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

interface AnimatedCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  index?: number
  staggerDelay?: number
  hoverEffect?: boolean
  hoverScale?: number
  hoverY?: number
  onHoverStart?: () => void
  onHoverEnd?: () => void
}

/**
 * Card component with scroll-triggered entrance and hover animations
 */
export function AnimatedCard({
  children,
  index = 0,
  staggerDelay = 0.1,
  hoverEffect = true,
  hoverScale = 1.02,
  hoverY = -5,
  onHoverStart,
  onHoverEnd,
  className = '',
  ...props
}: AnimatedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const ctx = gsap.context(() => {
      // Entrance animation
      gsap.fromTo(card,
        {
          opacity: 0,
          y: 50,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          delay: index * staggerDelay,
          ease: 'back.out(1.2)',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
          },
        }
      )

      // Hover animation
      if (hoverEffect) {
        card.addEventListener('mouseenter', (e) => {
          gsap.to(card, {
            scale: hoverScale,
            y: hoverY,
            duration: 0.3,
            ease: 'power2.out',
          })
          onHoverStart?.()
        })

        card.addEventListener('mouseleave', (e) => {
          gsap.to(card, {
            scale: 1,
            y: 0,
            duration: 0.3,
            ease: 'power2.out',
          })
          onHoverEnd?.()
        })
      }
    }, card)

    return () => ctx.revert()
  }, [index, staggerDelay, hoverEffect, hoverScale, hoverY, onHoverStart, onHoverEnd])

  return (
    <div
      ref={cardRef}
      className={`transition-shadow ${hoverEffect ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
