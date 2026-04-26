import { useEffect, useRef, ReactNode, AnchorHTMLAttributes } from 'react'
import gsap from 'gsap'

interface MagneticLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode
  strength?: number
  href: string
}

/**
 * Magnetic link (anchor) component - safe for use anywhere, no router dependency
 */
export function MagneticLink({
  children,
  strength = 0.3,
  className = '',
  onClick,
  ...props
}: MagneticLinkProps) {
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
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </a>
  )
}
