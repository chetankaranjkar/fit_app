import { useEffect, type RefObject } from 'react'
import gsap from 'gsap'

/**
 * Module-scoped GSAP helpers. Intentionally does NOT register plugins or
 * touch global GSAP config.
 */

/** Fade + slight upward motion stagger for list/table rows. */
export function useStaggerAnimation<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  selector: string,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const targets = root.querySelectorAll(selector)
    if (!targets.length) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.04,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      )
    }, root)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Subtle page fade-in on mount. */
export function usePageFadeIn<T extends HTMLElement>(ref: RefObject<T | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
      )
    }, el)
    return () => ctx.revert()
  }, [ref])
}
