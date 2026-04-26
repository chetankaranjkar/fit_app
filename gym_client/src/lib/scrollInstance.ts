import type { LocomotiveScroll } from 'locomotive-scroll'

let _locomotiveScrollInstance: LocomotiveScroll | null = null

/**
 * Set the global Locomotive Scroll instance
 * Called by DashboardLayout on mount
 */
export function setLocomotiveScrollInstance(instance: LocomotiveScroll | null) {
  _locomotiveScrollInstance = instance
}

/**
 * Get the current global Locomotive Scroll instance
 * Used by components like BackToTop to programmatically scroll
 */
export function getLocomotiveScrollInstance(): LocomotiveScroll | null {
  return _locomotiveScrollInstance
}
