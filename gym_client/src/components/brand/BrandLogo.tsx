import { Link } from 'react-router-dom'
import { TigerLogo } from '../marketing/TigerLogo'

type BrandLogoProps = {
  to?: string
  variant?: 'full' | 'mark' | 'stacked'
  size?: number
  className?: string
  /** Shown beside the logo when the sidebar is expanded (e.g. Admin Suite). */
  showSubtitle?: string
  collapsed?: boolean
}

/** Dashboard / login brand — uses `/tiger-fitness-logo.png`. */
export function BrandLogo({
  to = '/',
  variant = 'full',
  size = 36,
  className = '',
  showSubtitle,
  collapsed = false,
}: BrandLogoProps) {
  const logoVariant = collapsed ? 'mark' : variant
  const logoSize = collapsed ? Math.max(size, 36) : size

  const content = (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      <TigerLogo variant={logoVariant} size={logoSize} />
      {!collapsed && showSubtitle ? (
        <p className="min-w-0 truncate text-[9px] uppercase tracking-[0.2em] text-slate-500">
          {showSubtitle}
        </p>
      ) : null}
    </span>
  )

  if (to) {
    return (
      <Link to={to} className="inline-flex min-w-0" aria-label="Tiger Fitness — home">
        {content}
      </Link>
    )
  }

  return content
}
