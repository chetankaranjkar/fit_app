import type { CSSProperties } from 'react'

const LOGO_SRC = '/tiger-fitness-logo.png'

interface Props {
  variant?: 'full' | 'mark' | 'stacked'
  /** Height in px (width scales automatically). */
  size?: number
  className?: string
  style?: CSSProperties
}

/**
 * Tiger Fitness brand logo (PNG in /public).
 * The asset includes the full wordmark — use `mark` for a square tile in collapsed sidebars.
 */
export function TigerLogo({ variant = 'full', size = 36, className = '', style }: Props) {
  const alt = 'Tiger Fitness'

  if (variant === 'mark') {
    return (
      <img
        src={LOGO_SRC}
        alt={alt}
        width={size}
        height={size}
        className={`shrink-0 rounded-lg object-cover object-center ${className}`}
        style={style}
      />
    )
  }

  const height = variant === 'stacked' ? size * 1.35 : size

  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={`shrink-0 object-contain ${className}`}
      style={{ height, width: 'auto', maxWidth: height * 2.4, ...style }}
    />
  )
}
