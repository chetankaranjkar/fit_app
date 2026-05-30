import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { scrollToSection } from '../../../lib/animations/useSmoothScroll'

const WHATSAPP = '919999999999'
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Hi Tiger Fitness! I'm ready to transform. Can you help me get started?"
)

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
}

/**
 * Pre-footer conversion banner.
 * High-impact final CTA with giant gold watermark, dual buttons, and
 * Framer Motion fade-up reveals on scroll.
 */
export function PreFooterConversion() {
  return (
    <section
      id="ready"
      className="relative isolate overflow-hidden py-24 sm:py-28 lg:py-[120px]"
    >
      {/* Backdrop image */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-30">
        <img
          src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=2200&q=85&auto=format&fit=crop"
          alt=""
          loading="lazy"
          className="h-full w-full object-cover opacity-30"
        />
      </div>

      {/* Overlays */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/85 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_50%,rgba(245,196,0,0.18),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(245,196,0,0.5)] to-transparent" />
      </div>

      {/* Giant tiger watermark */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          stroke="#F5C400"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[60vmin] w-[60vmin] max-h-[700px] max-w-[700px] opacity-[0.06] blur-[2px]"
        >
          <path d="M8 7 C 11 14, 11 18, 8 25" />
          <path d="M16 5 C 19 13, 19 19, 16 27" />
          <path d="M24 7 C 27 14, 27 18, 24 25" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-8">
        <motion.span
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="font-display inline-flex items-center gap-2 rounded-full border border-[rgba(245,196,0,0.4)] bg-black/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#F5C400] backdrop-blur"
        >
          <span className="size-1.5 rounded-full bg-[#F5C400] shadow-[0_0_10px_rgba(245,196,0,0.8)]" />
          Final Step
        </motion.span>

        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          className="font-display mt-7 text-balance font-bold uppercase leading-[0.9] tracking-tight text-white text-[clamp(2.75rem,8vw,5rem)] sm:text-[clamp(4rem,8vw,7rem)]"
        >
          Ready To{' '}
          <span className="gradient-tiger-text">Transform?</span>
        </motion.h2>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#C8C8C8] sm:text-lg"
        >
          Join <span className="font-semibold text-white">500+ members</span> already
          training like a tiger. Start with a no-pressure free trial — leave with a
          custom plan whether you join or not.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <motion.button
            type="button"
            onClick={() => scrollToSection('plans')}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            className="group relative overflow-hidden rounded-full px-9 py-4 font-display text-sm font-bold uppercase tracking-[0.2em] text-black tiger-glow"
          >
            <span className="absolute inset-0 gradient-tiger" />
            <span className="absolute inset-0 translate-y-full bg-white transition-transform duration-500 group-hover:translate-y-0" />
            <span className="relative flex items-center gap-2">
              Join Today
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-4 transition-transform group-hover:translate-x-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </motion.button>

          <motion.a
            href={`https://wa.me/${WHATSAPP}?text=${WHATSAPP_MESSAGE}`}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            className="group inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/[0.04] px-8 py-4 font-display text-sm font-bold uppercase tracking-[0.2em] text-white backdrop-blur transition-colors hover:border-[#25D366] hover:bg-[#25D366]/10"
          >
            <MessageCircle className="size-4 text-[#25D366]" strokeWidth={2.2} />
            WhatsApp Us
          </motion.a>
        </motion.div>

        {/* Trust line */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
          className="mt-10 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.2em] text-[#888]"
        >
          <span className="flex items-center gap-2">
            <span className="size-1 rounded-full bg-[#F5C400]" />
            7-day satisfaction guarantee
          </span>
          <span className="flex items-center gap-2">
            <span className="size-1 rounded-full bg-[#F5C400]" />
            No long-term contracts
          </span>
          <span className="flex items-center gap-2">
            <span className="size-1 rounded-full bg-[#F5C400]" />
            Cancel anytime
          </span>
        </motion.p>
      </div>
    </section>
  )
}
