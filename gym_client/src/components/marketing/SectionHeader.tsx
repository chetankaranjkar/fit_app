import { useRevealOnScroll } from '../../lib/animations/useRevealOnScroll'

interface Props {
  eyebrow?: string
  title: string
  highlight?: string
  subtitle?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeader({
  eyebrow,
  title,
  highlight,
  subtitle,
  align = 'center',
  className = '',
}: Props) {
  const ref = useRevealOnScroll<HTMLDivElement>({ variant: 'up', stagger: 0.08, selector: '[data-reveal-child]' })

  return (
    <div
      ref={ref}
      className={`mx-auto ${align === 'center' ? 'text-center' : 'text-left'} max-w-2xl ${className}`}
    >
      {eyebrow && (
        <span
          data-reveal-child
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 backdrop-blur"
        >
          <span className="size-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400" />
          {eyebrow}
        </span>
      )}
      <h2
        data-reveal-child
        className="mt-5 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl"
      >
        {title}
        {highlight && (
          <>
            {' '}
            <span className="bg-[linear-gradient(135deg,#60a5fa_0%,#a78bfa_50%,#e879f9_100%)] bg-clip-text text-transparent">
              {highlight}
            </span>
          </>
        )}
      </h2>
      {subtitle && (
        <p
          data-reveal-child
          className="mt-5 text-base leading-relaxed text-slate-400 sm:text-lg"
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
