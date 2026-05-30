import { useRevealOnScroll } from '../../../lib/animations/useRevealOnScroll'
import { SectionHeader } from '../SectionHeader'

interface Tile {
  src: string
  title: string
  caption: string
  span: string
}

const TILES: Tile[] = [
  {
    src: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=85&auto=format&fit=crop',
    title: 'The Strength Floor',
    caption: 'Calibrated bumpers, GHDs, and a Rogue rack lineup',
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    src: 'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=900&q=85&auto=format&fit=crop',
    title: 'Performance Lab',
    caption: 'VO₂, DEXA, force plates',
    span: 'md:col-span-1',
  },
  {
    src: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=900&q=85&auto=format&fit=crop',
    title: 'Conditioning Bay',
    caption: 'Sleds · skis · assault bikes',
    span: 'md:col-span-1',
  },
  {
    src: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=900&q=85&auto=format&fit=crop',
    title: 'Recovery Suite',
    caption: 'Sauna · ice · contrast therapy',
    span: 'md:col-span-1',
  },
  {
    src: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=85&auto=format&fit=crop',
    title: 'Mobility Studio',
    caption: 'FRC, breathwork, prehab',
    span: 'md:col-span-2',
  },
]

export function FacilitySection() {
  const gridRef = useRevealOnScroll<HTMLDivElement>({
    variant: 'up',
    selector: '[data-tile]',
    stagger: 0.07,
  })

  return (
    <section id="facility" className="relative py-28 sm:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(245,196,0,0.4)] to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="The Facility"
          title="A premium gym"
          highlight="atmosphere."
          subtitle="A flagship space designed for elite training. Calibrated equipment, recovery technology, and the lighting to match the work."
        />

        <div
          ref={gridRef}
          className="mt-14 grid grid-cols-1 gap-3 md:grid-cols-3 md:auto-rows-[16rem] lg:auto-rows-[18rem]"
        >
          {TILES.map((t, i) => (
            <article
              key={i}
              data-tile
              className={`group relative overflow-hidden rounded-3xl border border-[rgba(245,196,0,0.15)] bg-black ${t.span}`}
            >
              <img
                src={t.src}
                alt={t.title}
                loading="lazy"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.07]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-90 transition group-hover:opacity-100" />

              {/* Gold corner accent */}
              <div className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full border border-[rgba(245,196,0,0.4)] bg-black/60 text-[#F5C400] backdrop-blur transition group-hover:bg-[rgba(245,196,0,0.15)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="size-4 transition-transform group-hover:rotate-45">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l10-10M9 7h8v8" />
                </svg>
              </div>

              {/* Caption */}
              <div className="absolute inset-x-5 bottom-5">
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-white sm:text-2xl">
                  {t.title}
                </h3>
                <p className="mt-1 text-sm text-[#B0B0B0]">{t.caption}</p>
              </div>

              {/* Bottom gold sweep */}
              <div className="absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 gradient-tiger transition-transform duration-500 group-hover:scale-x-100" />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
