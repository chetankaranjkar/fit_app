import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { LocomotiveScroll } from 'locomotive-scroll'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

/**
 * Integrates GSAP ScrollTrigger with Locomotive Scroll v5
 * Locomotive Scroll v5 uses Lenis underneath for smooth scrolling
 */
export function setupScrollTrigger(locomotiveScroll: LocomotiveScroll, fallbackScrollerEl?: HTMLElement | null) {
  // Get the scroller element
  const scrollerEl =
    ((locomotiveScroll as unknown as { el?: HTMLElement }).el ?? fallbackScrollerEl ?? null)

  if (!scrollerEl) {
    console.warn('[GSAP Setup] No scroller element found')
    return
  }

  // Get the Lenis instance from Locomotive Scroll (v5 stores it as lenisInstance)
  const lenisInstance = (locomotiveScroll as unknown as {
    lenisInstance?: {
      on: (event: string, cb: () => void) => void
      off: (event: string, cb: () => void) => void
      scroll: { y: number }
      scrollTo: (target: number, options?: { duration?: number; disableLerp?: boolean }) => void
    }
  }).lenisInstance

  // Set up ScrollTrigger proxy
  ScrollTrigger.scrollerProxy(scrollerEl, {
    scrollTop(value: number) {
      if (arguments.length && lenisInstance) {
        // Set scroll position
        lenisInstance.scrollTo(value, { duration: 0, disableLerp: true })
      }
      // Get scroll position
      return lenisInstance ? lenisInstance.scroll.y : 0
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: scrollerEl.clientWidth,
        height: scrollerEl.clientHeight,
      }
    },
    pinType: scrollerEl.style.transform ? 'transform' : 'fixed',
  })

  // Attach ScrollTrigger.update to Lenis scroll events
  if (lenisInstance) {
    lenisInstance.on('scroll', ScrollTrigger.update)
  } else {
    // Fallback: use Locomotive's render callback if available
    const onRender = () => ScrollTrigger.update()
    ;(locomotiveScroll as unknown as { _onRenderBind?: () => void })._onRenderBind = onRender
  }

  // Refresh ScrollTrigger after layout stabilizes
  setTimeout(() => {
    ScrollTrigger.refresh()
  }, 200)
}

/**
 * Clean up ScrollTrigger and event listeners
 */
export function cleanupScrollTrigger() {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
  ScrollTrigger.clearMatchMedia()
}

/**
 * Create a scroll-triggered animation with smooth scrubbing
 */
export function createScrollAnimation(
  targets: gsap.TweenTarget,
  animation: gsap.TweenVars,
  options: ScrollTrigger.Vars & { scroller?: LocomotiveScroll | string } = {}
) {
  const defaultOptions: ScrollTrigger.Vars = {
    trigger: targets,
    start: 'top 80%',
    end: 'bottom 20%',
    toggleActions: 'play none none reverse',
  }

  return gsap.to(targets, {
    ...animation,
    ...defaultOptions,
    ...options,
    scroller: options.scroller ? (options.scroller === 'viewport' ? 'viewport' : (options.scroller as LocomotiveScroll)?.el) : undefined,
  })
}

/**
 * Create a parallax effect tied to scroll position
 */
export function createParallax(
  targets: gsap.TweenTarget,
  distance: number,
  options: ScrollTrigger.Vars = {}
) {
  return gsap.to(targets, {
    y: distance,
    ease: 'none',
    scrollTrigger: {
      trigger: targets,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      ...options,
    },
  })
}

/**
 * Animate elements on scroll with stagger
 */
export function animateOnScroll(
  selector: string,
  animation: gsap.TweenVars,
  options: {
    stagger?: number | { each: number; from: 'start' | 'end' | 'center' | 'edges' | 'random' }
    scroller?: LocomotiveScroll | string
  } = {}
) {
  const elements = document.querySelectorAll<HTMLElement>(selector)
  if (!elements.length) return []

  gsap.fromTo(elements,
    { opacity: 0, y: 50 },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: options.stagger ?? 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: selector,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
    }
  )

  return []
}

/**
 * Animate a value (like counter) on scroll into view
 */
export function animateValueOnScroll(
  element: HTMLElement,
  start: number,
  end: number,
  duration: number = 2,
  options: ScrollTrigger.Vars = {}
) {
  const obj = { value: start }

  return gsap.to(obj, {
    value: end,
    duration,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: element,
      start: 'top 80%',
      onUpdate: () => {
        element.textContent = Math.round(obj.value).toLocaleString()
      },
      ...options,
    },
  })
}

export { gsap }
