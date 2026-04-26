import { useEffect, type RefObject } from 'react'
import gsap from 'gsap'

/**
 * Subtle page fade-in, scoped via gsap.context so cleanup is automatic.
 */
export function usePageFadeIn(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
      )
    }, el)
    return () => ctx.revert()
  }, [ref])
}

/**
 * Staggered appearance for children matching the given selector.
 */
export function useStaggerAnimation(
  ref: RefObject<HTMLElement | null>,
  selector: string,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        selector,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
          stagger: 0.05,
        },
      )
    }, el)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, selector, ...deps])
}
