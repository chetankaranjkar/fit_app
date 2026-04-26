import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

type RevealVariant = 'up' | 'fade' | 'scale' | 'slide-left' | 'slide-right'

interface RevealOptions {
  variant?: RevealVariant
  delay?: number
  duration?: number
  distance?: number
  stagger?: number
  once?: boolean
  start?: string
  selector?: string // optional: target children inside the ref
}

/**
 * Minimal, mobile-aware reveal-on-scroll hook.
 * Respects `prefers-reduced-motion` and simplifies distance on small screens.
 */
export function useRevealOnScroll<T extends HTMLElement>(options: RevealOptions = {}) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const isMobile = window.innerWidth < 640
    const {
      variant = 'up',
      delay = 0,
      duration = 0.9,
      distance = isMobile ? 24 : 48,
      stagger = 0.08,
      once = true,
      start = 'top 82%',
      selector,
    } = options

    const targets = selector ? node.querySelectorAll<HTMLElement>(selector) : [node]
    if (!targets.length) return

    const fromVars: gsap.TweenVars = { opacity: 0 }
    switch (variant) {
      case 'up':
        fromVars.y = distance
        break
      case 'slide-left':
        fromVars.x = -distance
        break
      case 'slide-right':
        fromVars.x = distance
        break
      case 'scale':
        fromVars.scale = 0.94
        break
      case 'fade':
      default:
        break
    }

    const tween = gsap.fromTo(
      targets,
      fromVars,
      {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration,
        delay,
        ease: 'expo.out',
        stagger: selector ? stagger : 0,
        scrollTrigger: {
          trigger: node,
          start,
          toggleActions: once ? 'play none none none' : 'play none none reverse',
        },
      }
    )

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return ref
}

/**
 * Parallax tween on scroll, scrubbed to scroll position.
 */
export function useParallax<T extends HTMLElement>(distance: number = 60) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return
    if (window.innerWidth < 640) return // skip on mobile for perf

    const tween = gsap.fromTo(
      node,
      { y: -distance / 2 },
      {
        y: distance / 2,
        ease: 'none',
        scrollTrigger: {
          trigger: node,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    )

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [distance])

  return ref
}
