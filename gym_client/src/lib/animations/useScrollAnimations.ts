import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { setupScrollTrigger, cleanupScrollTrigger } from './gsapSetup'
import type { LocomotiveScroll } from 'locomotive-scroll'

/**
 * Hook to integrate GSAP ScrollTrigger with a Locomotive Scroll instance
 */
export function useLocomotiveScrollIntegration(
  locomotiveScroll: LocomotiveScroll | null,
  deps: React.DependencyList = []
) {
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!locomotiveScroll || initializedRef.current) return

    // Setup ScrollTrigger integration
    setupScrollTrigger(locomotiveScroll)
    initializedRef.current = true

    // Refresh ScrollTrigger after a short delay to ensure layout is ready
    const timeout = setTimeout(() => {
      ScrollTrigger.refresh()
    }, 100)

    return () => {
      clearTimeout(timeout)
      if (initializedRef.current) {
        cleanupScrollTrigger()
        initializedRef.current = false
      }
    }
  }, [locomotiveScroll, ...deps])
}

/**
 * Hook to create scroll-triggered animations for a ref element
 */
export function useScrollTrigger(
  ref: React.RefObject<HTMLElement>,
  animation: gsap.TweenVars,
  scrollTriggerOptions: ScrollTrigger.Vars = {}
) {
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const ctx = gsap.context(() => {
      gsap.fromTo(element,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
            ...scrollTriggerOptions,
          },
        }
      )
    }, ref)

    return () => ctx.revert()
  }, [ref])
}

/**
 * Hook for staggered animations on multiple child elements
 */
export function useStaggeredAnimation(
  ref: React.RefObject<HTMLElement>,
  selector: string,
  staggerDelay: number = 0.1,
  animation?: gsap.TweenVars
) {
  useEffect(() => {
    const parent = ref.current
    if (!parent) return

    const ctx = gsap.context(() => {
      const children = parent.querySelectorAll(selector)

      gsap.fromTo(children,
        { opacity: 0, y: 30, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          stagger: staggerDelay,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: parent,
            start: 'top 80%',
          },
        }
      )
    }, ref)

    return () => ctx.revert()
  }, [ref, selector, staggerDelay])
}

/**
 * Hook for animated counters that increment on scroll into view
 */
export function useAnimatedCounter(
  ref: React.RefObject<HTMLElement>,
  targetValue: number,
  options: { duration?: number; prefix?: string; suffix?: string; decimals?: number } = {}
) {
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const { duration = 2, prefix = '', suffix = '', decimals = 0 } = options

    const obj = { value: 0 }

    const ctx = gsap.context(() => {
      gsap.to(obj, {
        value: targetValue,
        duration,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 80%',
          onUpdate: () => {
            const formatted = obj.value.toLocaleString(undefined, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })
            element.textContent = `${prefix}${formatted}${suffix}`
          },
        },
      })
    }, ref)

    return () => ctx.revert()
  }, [ref, targetValue, options])
}

/**
 * Hook for parallax effect on an element
 */
export function useParallax(
  ref: React.RefObject<HTMLElement>,
  distance: number,
  options: ScrollTrigger.Vars = {}
) {
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const ctx = gsap.context(() => {
      gsap.to(element, {
        y: distance,
        ease: 'none',
        scrollTrigger: {
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          ...options,
        },
      })
    }, ref)

    return () => ctx.revert()
  }, [ref, distance])
}
