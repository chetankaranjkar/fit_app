import { useEffect } from 'react'

/**
 * Lightweight smooth-scroll experience for the marketing site.
 *
 * Strategy:
 *   1. Enable native CSS `scroll-behavior: smooth` on the document root so
 *      anchor navigation feels polished.
 *   2. Respect `prefers-reduced-motion` — fall back to instant scroll.
 *
 * We intentionally avoid a JS scroll-hijack (a la Lenis/Locomotive) here
 * because the dashboard already wires Locomotive-Scroll and we don't want to
 * double-bind scroll containers on this page. Combined with GSAP
 * ScrollTrigger tween easings, this delivers a premium feel without the
 * fragility of a full virtual scroll layer.
 */
export function useSmoothScroll(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const html = document.documentElement
    const previous = html.style.scrollBehavior

    html.style.scrollBehavior = prefersReduced ? 'auto' : 'smooth'

    return () => {
      html.style.scrollBehavior = previous
    }
  }, [enabled])
}

/**
 * Scroll to a section by id with an offset for the fixed nav.
 */
export function scrollToSection(id: string, offset: number = 72) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior: 'smooth' })
}
