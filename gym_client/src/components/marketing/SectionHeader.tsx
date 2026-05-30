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
      className={`mx-auto ${align === 'center' ? 'text-center' : 'text-left'} max-w-3xl ${className}`}
    >
      {eyebrow && (
        <span
          data-reveal-child
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,196,0,0.3)] bg-[rgba(245,196,0,0.06)] px-3.5 py-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F5C400] backdrop-blur"
        >
          <span className="size-1.5 rounded-full bg-[#F5C400] shadow-[0_0_10px_rgba(245,196,0,0.8)]" />
          {eyebrow}
        </span>
      )}
      <h2
        data-reveal-child
        className="font-display mt-5 text-balance text-4xl font-bold uppercase leading-[0.95] tracking-[0.01em] text-white sm:text-5xl md:text-6xl lg:text-7xl"
      >
        {title}
        {highlight && (
          <>
            {' '}
            <span className="gradient-tiger-text">{highlight}</span>
          </>
        )}
      </h2>
      {subtitle && (
        <p
          data-reveal-child
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#B0B0B0] sm:text-lg"
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
