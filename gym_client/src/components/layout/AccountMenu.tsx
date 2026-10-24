import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, ChevronDown, LogOut, UserRound } from 'lucide-react'
import { authService } from '../../services/auth.service'
import { linkPrefetchProps } from '../../routes/prefetch'
import './AccountMenu.css'

export function AccountMenu({ userName, userAvatarUrl, onOpen }: {
  userName: string
  userAvatarUrl?: string | null
  onOpen: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const loggingOutRef = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const initialItem = useRef(0)
  const menuId = useId()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const initials = userName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')
      if (items?.length) items[initialItem.current === -1 ? items.length - 1 : 0]?.focus()
    })
    const dismissOutside = (event: Event) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('focusin', dismissOutside)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('focusin', dismissOutside)
    }
  }, [open])

  function showMenu(last = false) {
    initialItem.current = last ? -1 : 0
    onOpen()
    setOpen(true)
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
      return
    }
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])
    const index = items.indexOf(document.activeElement as HTMLElement)
    let next: number
    if (event.key === 'ArrowDown') next = (index + 1) % items.length
    else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return
    event.preventDefault()
    items[next]?.focus()
  }

  async function logout() {
    if (loggingOutRef.current) return
    loggingOutRef.current = true
    setLoggingOut(true)
    try {
      await authService.logout()
    } catch {
      // Local sign-out still completes if the server cannot be reached.
    }
    authService.clearSession()
    navigate('/login', { replace: true })
  }

  return <div className="account-menu" ref={rootRef}>
    <button ref={triggerRef} type="button" className="account-menu-trigger" aria-label="Open account menu"
      title="Your account" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onClick={() => { if (open) setOpen(false); else showMenu() }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          showMenu(event.key === 'ArrowUp')
        } else if (event.key === 'Escape') setOpen(false)
      }}>
      <span className="account-menu-avatar">{userAvatarUrl ? <img src={userAvatarUrl} alt="" /> : initials || 'U'}</span>
      <span className="account-menu-name">{userName}</span>
      <ChevronDown className={`size-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
    </button>
    {open && <div className="account-menu-panel">
      <div className="account-menu-heading"><p>{userName}</p><span>Your account</span></div>
      <div id={menuId} ref={menuRef} role="menu" aria-label="Account" onKeyDown={handleKeyDown}>
        <Link role="menuitem" tabIndex={-1} to="/dashboard/profile" {...linkPrefetchProps('/dashboard/profile')} onClick={() => setOpen(false)}>
          <UserRound aria-hidden="true" className="size-4 shrink-0" /><span>Profile & account settings</span>
        </Link>
        <Link role="menuitem" tabIndex={-1} to="/help" {...linkPrefetchProps('/help')} onClick={() => setOpen(false)}>
          <BookOpen aria-hidden="true" className="size-4 shrink-0" /><span>Help Center</span>
        </Link>
        <div className="account-menu-divider" role="separator" />
        <button role="menuitem" tabIndex={-1} type="button" className="account-menu-logout" disabled={loggingOut} onClick={() => void logout()}>
          <LogOut aria-hidden="true" className="size-4 shrink-0" /><span>{loggingOut ? 'Logging out…' : 'Log out'}</span>
        </button>
      </div>
    </div>}
  </div>
}
