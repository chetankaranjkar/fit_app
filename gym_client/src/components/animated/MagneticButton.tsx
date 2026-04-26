import { useEffect, useRef, ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'
import gsap from 'gsap'

interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

/**
 * Magnetic hover effect button
 */
export function MagneticButton({
  children,
  strength = 0.3,
  hoverEffect = 'magnetic',
  className = '',
  ...props
}: BaseButtonProps & { strength?: number; hoverEffect?: 'magnetic' | 'scale' | 'both' }) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    if (!button || (hoverEffect !== 'magnetic' && hoverEffect !== 'both')) return

    let bounds: DOMRect
    let hover = false

    const onMouseEnter = () => {
      bounds = button.getBoundingClientRect()
      hover = true
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!hover || !bounds) return

      gsap.to(button, {
        x: (e.clientX - bounds.left - bounds.width / 2) * strength,
        y: (e.clientY - bounds.top - bounds.height / 2) * strength,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const onMouseLeave = () => {
      hover = false
      gsap.to(button, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)',
      })
    }

    button.addEventListener('mouseenter', onMouseEnter)
    button.addEventListener('mousemove', onMouseMove)
    button.addEventListener('mouseleave', onMouseLeave)

    return () => {
      button.removeEventListener('mouseenter', onMouseEnter)
      button.removeEventListener('mousemove', onMouseMove)
      button.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [strength, hoverEffect])

  return (
    <button
      ref={buttonRef}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * Scale on hover button (simpler alternative)
 */
export function AnimatedButton({
  children,
  className = '',
  ...props
}: BaseButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    if (!button) return

    const ctx = gsap.context(() => {
      button.addEventListener('mouseenter', () => {
        gsap.to(button, {
          scale: 1.05,
          duration: 0.2,
          ease: 'power2.out',
        })
      })

      button.addEventListener('mouseleave', () => {
        gsap.to(button, {
          scale: 1,
          duration: 0.2,
          ease: 'power2.out',
        })
      })
    }, button)

    return () => ctx.revert()
  }, [])

  return (
    <button
      ref={buttonRef}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * Magnetic hover effect link (anchor)
 * Uses href prop for navigation (react-router will intercept)
 */
export function MagneticLink({
  children,
  strength = 0.3,
  className = '',
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const linkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const link = linkRef.current
    if (!link) return

    let bounds: DOMRect
    let hover = false

    const onMouseEnter = () => {
      bounds = link.getBoundingClientRect()
      hover = true
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!hover || !bounds) return

      gsap.to(link, {
        x: (e.clientX - bounds.left - bounds.width / 2) * strength,
        y: (e.clientY - bounds.top - bounds.height / 2) * strength,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const onMouseLeave = () => {
      hover = false
      gsap.to(link, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)',
      })
    }

    link.addEventListener('mouseenter', onMouseEnter)
    link.addEventListener('mousemove', onMouseMove)
    link.addEventListener('mouseleave', onMouseLeave)

    return () => {
      link.removeEventListener('mouseenter', onMouseEnter)
      link.removeEventListener('mousemove', onMouseMove)
      link.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [strength])

  return (
    <a
      ref={linkRef}
      href={href}
      className={className}
      {...props}
    >
      {children}
    </a>
  )
}
