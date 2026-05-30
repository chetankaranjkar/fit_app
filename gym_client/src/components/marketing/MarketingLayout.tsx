import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { MarketingNav } from './MarketingNav'
import { MarketingFooter } from './MarketingFooter'
import { WhatsAppFloatingCTA } from './WhatsAppFloatingCTA'
import { useSmoothScroll } from '../../lib/animations/useSmoothScroll'

export function MarketingLayout({ children }: { children: ReactNode }) {
  useSmoothScroll(true)

  useEffect(() => {
    // Prevent horizontal overflow from GSAP translates
    const prev = document.body.style.overflowX
    document.body.style.overflowX = 'hidden'
    return () => {
      document.body.style.overflowX = prev
    }
  }, [])

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-white antialiased">
      {/* Ambient gold glow background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 size-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(245,196,0,0.14),transparent_60%)] blur-2xl" />
        <div className="absolute top-[40%] -right-60 size-[45rem] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(245,196,0,0.08),transparent_60%)] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-[50rem] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(245,196,0,0.06),transparent_60%)] blur-2xl" />

        {/* Subtle dotted grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(245,196,0,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,196,0,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Tiger stripe ambient layer */}
        <div className="absolute inset-0 opacity-[0.5] tiger-stripes" />
      </div>

      <MarketingNav />
      <main className="relative">{children}</main>
      <MarketingFooter />
      <WhatsAppFloatingCTA />
    </div>
  )
}
