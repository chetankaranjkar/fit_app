import type { SVGProps } from 'react'

/**
 * Lucide-style stroked icons used across the Owner Analytics module.
 * Kept inline so the module has no extra dependency.
 */
function Base(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  )
}

export function IconRupee(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M6 4h12" />
      <path d="M6 8h12" />
      <path d="M6 12h7a4 4 0 000-8H6" />
      <path d="M6 12l8 8" />
    </Base>
  )
}

export function IconUsers(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </Base>
  )
}

export function IconAlert(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Base>
  )
}

export function IconWrench(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M14.7 6.3a4 4 0 015.66 5.66l-1.8 1.8a2 2 0 01-2.83 0l-.7-.7-7.07 7.07a2 2 0 01-2.83-2.83l7.07-7.07-.7-.7a2 2 0 010-2.83l1.8-1.8a4 4 0 012.83 0z" />
    </Base>
  )
}

export function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Base>
  )
}

export function IconTrendingUp(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </Base>
  )
}

export function IconTrendingDown(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </Base>
  )
}

export function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Base>
  )
}

export function IconBell(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </Base>
  )
}

export function IconInbox(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </Base>
  )
}

export function IconChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <polyline points="9 18 15 12 9 6" />
    </Base>
  )
}

export function IconActivity(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Base>
  )
}

export function IconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </Base>
  )
}
