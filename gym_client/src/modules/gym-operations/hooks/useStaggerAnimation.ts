import { useEffect, type RefObject } from 'react'
import gsap from 'gsap'

/**
 * Scoped GSAP helper for this module only.
 *
 * It animates direct children of the ref (or any selector inside it) with a
 * fade + slight upward motion, reapplying on each `deps` change so freshly
 * loaded data / filtered results re-stagger cleanly.
 *
 * Intentionally does NOT register any plugins or touch global GSAP config.
 */
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
          stagger: 0.05,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      )
    }, root)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/**
 * Animates a numeric progress bar width from 0% to `percent` when it mounts
 * or when the value changes. Scoped to the Cleaning page.
 */
export function useProgressAnimation<T extends HTMLElement>(
  ref: RefObject<T | null>,
  percent: number,
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { width: '0%' },
        {
          width: `${Math.max(0, Math.min(100, percent))}%`,
          duration: 0.9,
          ease: 'power3.out',
        },
      )
    }, el)
    return () => ctx.revert()
  }, [ref, percent])
}

/**
 * Fades the entire page in on mount. Subtle and self-contained.
 */
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
