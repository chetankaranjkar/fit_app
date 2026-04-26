import { useRevealOnScroll } from '../../../lib/animations/useRevealOnScroll'
import { SectionHeader } from '../SectionHeader'
import { BeforeAfterSlider } from '../BeforeAfterSlider'

const TRANSFORMS = [
  {
    before: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80&auto=format&fit=crop',
    after: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80&auto=format&fit=crop',
    name: 'Rohan · 32',
    duration: '24 weeks · Performance plan',
    result: '-14kg · +8kg squat',
  },
  {
    before: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=900&q=80&auto=format&fit=crop',
    after: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=900&q=80&auto=format&fit=crop',
    name: 'Priya · 28',
    duration: '16 weeks · Hypertrophy',
    result: '+5kg lean · -6% BF',
  },
]

const MASONRY = [
  'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&q=80&auto=format&fit=crop',
]

export function GallerySection() {
  const rowRef = useRevealOnScroll<HTMLDivElement>({
    variant: 'up',
    selector: '[data-transform]',
    stagger: 0.12,
  })
  const masonryRef = useRevealOnScroll<HTMLDivElement>({
    variant: 'scale',
    selector: '[data-masonry-item]',
    stagger: 0.06,
  })

  return (
    <section id="gallery" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="Results"
          title="Drag the slider. See"
          highlight="real transformations."
          subtitle="Every photo is from a real IronPulse member with written consent. Results vary — the consistency doesn't."
        />

        {/* Before/after row */}
        <div ref={rowRef} className="mt-16 grid gap-6 md:grid-cols-2">
          {TRANSFORMS.map((t, i) => (
            <div key={i} data-transform>
              <BeforeAfterSlider {...t} />
            </div>
          ))}
        </div>

        {/* Masonry */}
        <div ref={masonryRef} className="mt-10 columns-2 gap-3 md:columns-3 lg:columns-4">
          {MASONRY.map((src, i) => (
            <div
              key={i}
              data-masonry-item
              className="mb-3 overflow-hidden rounded-xl border border-white/5 transition hover:border-white/15"
              style={{ breakInside: 'avoid' }}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className="h-auto w-full object-cover transition duration-700 hover:scale-[1.04]"
                style={{ aspectRatio: i % 3 === 0 ? '3/4' : i % 2 === 0 ? '1/1' : '4/5' }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
