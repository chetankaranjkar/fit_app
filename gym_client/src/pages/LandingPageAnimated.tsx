import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Hero3DScene } from '../components/three/Hero3DScene'
import { MagneticButton } from '../components/animated/MagneticButton'
import { AnimatedElement } from '../components/animated/AnimatedElement'

const features = [
  {
    title: 'Member management',
    description: 'Track memberships, check-ins, and progress in one place.',
    icon: '👥',
  },
  {
    title: 'Workout plans',
    description: 'Create and assign plans for members and instructors.',
    icon: '📋',
  },
  {
    title: 'Attendance & reports',
    description: 'Real-time attendance and insights for admins.',
    icon: '📊',
  },
]

export function LandingPage() {
  const heroRef = useRef<HTMLElement>(null)
  const featuresRef = useRef<HTMLElement>(null)
  const statsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // Register ScrollTrigger
    gsap.registerPlugin(ScrollTrigger)

    // Nav bar animation
    gsap.from('header', {
      y: -100,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
    })

    // Hero text animation
    gsap.fromTo(heroRef.current?.querySelector('h1'),
      { y: 100, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.2,
        delay: 0.3,
        ease: 'power3.out',
      }
    )

    gsap.fromTo(heroRef.current?.querySelector('p'),
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        delay: 0.6,
        ease: 'power3.out',
      }
    )

    gsap.fromTo(heroRef.current?.querySelector('.hero-buttons'),
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        delay: 0.9,
        ease: 'back.out(1.7)',
      }
    )

    // Features section animation
    gsap.fromTo('.feature-card',
      { y: 80, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: featuresRef.current,
          start: 'top 70%',
        },
      }
    )

    // Stats counter animation (if we add stats later)
    ScrollTrigger.create({
      trigger: statsRef.current,
      start: 'top 80%',
      onEnter: () => {
        // Animate counters here
      },
    })

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [])

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault()
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen w-[100vw] max-w-[100vw] overflow-x-hidden bg-zinc-950 text-white relative">
      {/* 3D Hero Background */}
      <div className="absolute inset-0 z-0 opacity-60">
        <Hero3DScene />
      </div>

      {/* Nav */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl" style={{ width: '100vw', maxWidth: '100vw' }}>
        <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6" style={{ maxWidth: '90vw' }}>
          <Link
            to="/"
            className="text-xl font-bold tracking-tight text-white hover:text-amber-400 transition-colors"
          >
            GYM<span className="text-amber-500">Pro</span>
          </Link>
          <nav className="flex items-center gap-6">
            <a
              href="#features"
              onClick={(e) => handleSmoothScroll(e, 'features')}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <MagneticButton
              to="/login"
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
            >
              Sign in
            </MagneticButton>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative z-10 pt-28 pb-24 sm:pt-36 sm:pb-32"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(245,158,11,0.15),transparent)]" />
        <div className="relative mx-auto px-4 text-center sm:px-6" style={{ maxWidth: '90vw' }}>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Manage your gym.
            <br />
            <span className="text-amber-500">One platform.</span>
          </h1>
          <p className="mx-auto mt-6 text-lg text-zinc-400" style={{ maxWidth: 'min(90vw, 42rem)' }}>
            Members, instructors, and admins in sync. Schedules, attendance, and
            progress—all in GYMPro.
          </p>
          <div className="hero-buttons mt-10 flex flex-wrap items-center justify-center gap-4">
            <MagneticButton
              to="/login"
              className="rounded-xl bg-amber-500 px-8 py-3.5 text-base font-semibold text-black transition hover:bg-amber-400"
            >
              Sign in
            </MagneticButton>
            <a
              href="#features"
              onClick={(e) => handleSmoothScroll(e, 'features')}
              className="rounded-xl border border-zinc-600 px-8 py-3.5 text-base font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800/50"
            >
              See features
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        ref={featuresRef}
        className="relative z-10 border-t border-zinc-800/50 bg-zinc-900/30 py-24 sm:py-28"
      >
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: '90vw' }}>
          <AnimatedElement animation="fadeIn">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need
            </h2>
            <p className="mx-auto mt-4 text-center text-zinc-400" style={{ maxWidth: 'min(90vw, 36rem)' }}>
              Built for gyms that want clarity and control.
            </p>
          </AnimatedElement>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, index) => (
              <AnimatedElement
                key={f.title}
                animation="slideUp"
                delay={index * 0.1}
                className="feature-card rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6 transition hover:border-amber-500/30"
              >
                <span className="text-3xl" aria-hidden>
                  {f.icon}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-zinc-400">{f.description}</p>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="relative z-10 border-t border-zinc-800/50 py-16">
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: '90vw' }}>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { label: 'Active Members', value: '2,500+' },
              { label: 'Trainers', value: '50+' },
              { label: 'Workout Plans', value: '500+' },
              { label: 'Success Rate', value: '98%' },
            ].map((stat, index) => (
              <AnimatedElement
                key={stat.label}
                animation="fadeIn"
                delay={index * 0.1}
                className="text-center"
              >
                <div className="text-3xl font-bold text-amber-500">{stat.value}</div>
                <div className="mt-1 text-sm text-zinc-400">{stat.label}</div>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-zinc-800/50 py-24 sm:py-28">
        <div className="mx-auto px-4 text-center sm:px-6" style={{ maxWidth: '90vw' }}>
          <AnimatedElement animation="scale">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-4 text-zinc-400">
              Sign in with your Member, Instructor, or Admin account.
            </p>
          </AnimatedElement>
          <AnimatedElement animation="slideUp" delay={0.2} className="mt-8">
            <MagneticButton
              to="/login"
              className="inline-block rounded-xl bg-amber-500 px-10 py-4 text-lg font-semibold text-black transition hover:bg-amber-400"
            >
              Sign in to GYMPro
            </MagneticButton>
          </AnimatedElement>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/50 bg-zinc-900/50 py-8">
        <div className="mx-auto px-4 text-center text-sm text-zinc-500 sm:px-6" style={{ maxWidth: '90vw' }}>
          GYMPro — Gym Management. Sign in to access your dashboard.
          <div className="mt-2 text-xs text-zinc-600">
            Crafted with precision ✨
          </div>
        </div>
      </footer>
    </div>
  )
}
