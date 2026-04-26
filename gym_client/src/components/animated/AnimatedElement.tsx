import { useEffect, useRef, ReactNode, HTMLAttributes } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLocomotiveScrollIntegration } from '../../lib/animations/useScrollAnimations'
import { useScrollTrigger } from '../../lib/animations/useScrollAnimations'

interface AnimatedElementProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  animation?: 'fadeIn' | 'slideUp' | 'slideInLeft' | 'slideInRight' | 'scale' | 'custom'
  customAnimation?: gsap.TweenVars
  delay?: number
  duration?: number
  ease?: gsap.Ease
  scroller?: HTMLElement | null
  once?: boolean
  toggleActions?: string
}

/**
 * A wrapper component that animates its children on scroll
 */
export function AnimatedElement({
  children,
  animation = 'fadeIn',
  customAnimation,
  delay = 0,
  duration = 0.8,
  ease = 'power3.out',
  scroller,
  once = true,
  toggleActions = 'play none none reverse',
  className = '',
  ...props
}: AnimatedElementProps) {
  const ref = useRef<HTMLElement>(null)

  // Get Locomotive Scroll instance if available
  const locomotiveScroll = useRef<LocomotiveScroll | null>(null)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const scrollContainer = document.querySelector('[data-scroll-container]')
      if (scrollContainer) {
        // @ts-expect-error accessing internal locomotive instance
        locomotiveScroll.current = scrollContainer.__locomotiveScroll
      }
    }
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const ctx = gsap.context(() => {
      let fromVars: gsap.TweenVars
      let toVars: gsap.TweenVars = {
        duration,
        delay,
        ease,
        scrollTrigger: {
          trigger: element,
          start: 'top 80%',
          toggleActions,
          scroller: scroller || locomotiveScroll.current?.el,
          ...(once && { onComplete: () => ScrollTrigger.create({ trigger: element, start: 'top 100%' }) }),
        },
      }

      switch (animation) {
        case 'fadeIn':
          fromVars = { opacity: 0 }
          toVars.opacity = 1
          break
        case 'slideUp':
          fromVars = { opacity: 0, y: 40 }
          toVars.opacity = 1
          toVars.y = 0
          break
        case 'slideInLeft':
          fromVars = { opacity: 0, x: -50 }
          toVars.opacity = 1
          toVars.x = 0
          break
        case 'slideInRight':
          fromVars = { opacity: 0, x: 50 }
          toVars.opacity = 1
          toVars.x = 0
          break
        case 'scale':
          fromVars = { opacity: 0, scale: 0.9 }
          toVars.opacity = 1
          toVars.scale = 1
          break
        case 'custom':
          if (!customAnimation) return
          fromVars = {}
          Object.assign(toVars, customAnimation)
          break
        default:
          fromVars = { opacity: 0, y: 20 }
          toVars.opacity = 1
          toVars.y = 0
      }

      gsap.fromTo(element, fromVars, toVars)
    }, ref)

    return () => ctx.revert()
  }, [ref, animation, customAnimation, delay, duration, ease, scroller, once, toggleActions])

  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  )
}
