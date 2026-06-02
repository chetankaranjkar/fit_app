import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { usersService } from '../../services/users.service'
import { trainersService } from '../../services/trainers.service'
import { membershipPlansService } from '../../services/membershipPlans.service'
import { trainerFullName } from '../../types/trainer'
import type { User } from '../../types/user'
import type { Trainer } from '../../types/trainer'
import type { MembershipPlan } from '../../types/membershipPlan'
import { displayAadhaar } from '../../lib/aadhaar'

const MIN_CHARS = 2
const DEBOUNCE_MS = 300

function memberLabel(u: User) {
  return [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || `Member #${u.id}`
}

function memberSubtitle(u: User) {
  const aadhaar = displayAadhaar(u)
  if (aadhaar !== '—') {
    return [u.email, u.phone, aadhaar].filter(Boolean).join(' · ')
  }
  return u.email || u.phone || undefined
}

type SearchResults = {
  members: User[]
  trainers: Trainer[]
  plans: MembershipPlan[]
}

export function GlobalSearch({ className = '' }: { className?: string }) {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setActiveIndex(-1)
  }, [debouncedQuery])

  const canSearch = debouncedQuery.length >= MIN_CHARS

  const { data, isFetching, isError } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async (): Promise<SearchResults> => {
      const q = debouncedQuery
      const [usersRes, trainersRes, plansRes] = await Promise.all([
        usersService.getPaged({ page: 1, pageSize: 8, search: q, membersOnly: true }),
        trainersService.getPaged({ page: 1, pageSize: 6, search: q }),
        membershipPlansService.getAll(),
      ])
      const needle = q.toLowerCase()
      const plans = (Array.isArray(plansRes.data) ? plansRes.data : []).filter((p) =>
        p.planName.toLowerCase().includes(needle),
      ).slice(0, 5)
      return {
        members: usersRes.data?.items ?? [],
        trainers: trainersRes.data?.data ?? [],
        plans,
      }
    },
    enabled: canSearch,
    staleTime: 30_000,
    retry: 1,
  })

  const members = data?.members ?? []
  const trainers = data?.trainers ?? []
  const plans = data?.plans ?? []
  const totalHits = members.length + trainers.length + plans.length

  type FlatItem =
    | { kind: 'member'; id: number; label: string; sub?: string }
    | { kind: 'trainer'; id: number; label: string; sub?: string }
    | { kind: 'plan'; id: number; label: string; sub?: string }
    | { kind: 'view-all-members'; q: string }

  const flatItems: FlatItem[] = [
    ...members.map((m) => ({
      kind: 'member' as const,
      id: m.id,
      label: memberLabel(m),
      sub: memberSubtitle(m),
    })),
    ...trainers.map((t) => ({
      kind: 'trainer' as const,
      id: t.id,
      label: trainerFullName(t),
      sub: t.email ?? t.trainerCode ?? undefined,
    })),
    ...plans.map((p) => ({
      kind: 'plan' as const,
      id: p.id,
      label: p.planName,
      sub: p.durationDays ? `${p.durationDays} days` : undefined,
    })),
  ]
  if (canSearch) {
    flatItems.push({ kind: 'view-all-members', q: debouncedQuery })
  }

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      const root = rootRef.current
      if (!root || !(e.target instanceof Node) || root.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  const goToItem = (item: FlatItem) => {
    setOpen(false)
    setQuery('')
    setDebouncedQuery('')
    if (item.kind === 'member') {
      navigate(`/dashboard/users/${item.id}`)
      return
    }
    if (item.kind === 'trainer') {
      navigate(`/dashboard/trainers/${item.id}`)
      return
    }
    if (item.kind === 'plan') {
      navigate('/dashboard/membership-plans')
      return
    }
    navigate(`/dashboard/users?q=${encodeURIComponent(item.q)}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    if (activeIndex >= 0 && activeIndex < flatItems.length) {
      goToItem(flatItems[activeIndex]!)
      return
    }
    setOpen(false)
    navigate(`/dashboard/users?q=${encodeURIComponent(q)}`)
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!open || flatItems.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % flatItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? flatItems.length - 1 : i - 1))
    }
  }

  const showPanel = open && query.trim().length > 0

  return (
    <form
      ref={rootRef}
      role="search"
      onSubmit={handleSubmit}
      className={`relative w-full ${className}`.trim()}
    >
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
      </span>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search members, trainers, plans, Aadhaar…"
        aria-label="Search members, trainers, plans, and Aadhaar"
        autoComplete="off"
        className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 transition focus:border-blue-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-blue-400/20"
      />

      {showPanel ? (
        <div
          id="global-search-results"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(24rem,70vh)] overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(17,17,39,0.98)] py-2 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          {query.trim().length < MIN_CHARS ? (
            <p className="px-4 py-3 text-xs text-slate-400">Type at least {MIN_CHARS} characters…</p>
          ) : isFetching ? (
            <p className="px-4 py-3 text-xs text-slate-400">Searching…</p>
          ) : isError ? (
            <p className="px-4 py-3 text-xs text-rose-300">Search failed. Try again.</p>
          ) : totalHits === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-400">
              No matches. Press Enter to search all members.
            </p>
          ) : (
            <>
              {members.length > 0 ? (
                <ResultSection title="Members">
                  {members.map((m, i) => {
                    const idx = i
                    const active = activeIndex === idx
                    return (
                      <ResultRow
                        key={`m-${m.id}`}
                        active={active}
                        label={memberLabel(m)}
                        sub={memberSubtitle(m)}
                        onHover={() => setActiveIndex(idx)}
                        onSelect={() => goToItem(flatItems[idx]!)}
                      />
                    )
                  })}
                </ResultSection>
              ) : null}
              {trainers.length > 0 ? (
                <ResultSection title="Trainers">
                  {trainers.map((t, i) => {
                    const idx = members.length + i
                    const active = activeIndex === idx
                    return (
                      <ResultRow
                        key={`t-${t.id}`}
                        active={active}
                        label={trainerFullName(t)}
                        sub={t.email ?? t.trainerCode ?? undefined}
                        onHover={() => setActiveIndex(idx)}
                        onSelect={() => goToItem(flatItems[idx]!)}
                      />
                    )
                  })}
                </ResultSection>
              ) : null}
              {plans.length > 0 ? (
                <ResultSection title="Plans">
                  {plans.map((p, i) => {
                    const idx = members.length + trainers.length + i
                    const active = activeIndex === idx
                    return (
                      <ResultRow
                        key={`p-${p.id}`}
                        active={active}
                        label={p.planName}
                        sub={p.durationDays ? `${p.durationDays} days` : undefined}
                        onHover={() => setActiveIndex(idx)}
                        onSelect={() => goToItem(flatItems[idx]!)}
                      />
                    )
                  })}
                </ResultSection>
              ) : null}
              <button
                type="button"
                className={`mt-1 w-full border-t border-white/10 px-4 py-2.5 text-left text-xs font-medium transition ${
                  activeIndex === flatItems.length - 1
                    ? 'bg-blue-500/15 text-blue-200'
                    : 'text-blue-300 hover:bg-white/5'
                }`}
                onMouseEnter={() => setActiveIndex(flatItems.length - 1)}
                onClick={() => goToItem({ kind: 'view-all-members', q: debouncedQuery })}
              >
                View all member results for &ldquo;{debouncedQuery}&rdquo;
              </button>
            </>
          )}
        </div>
      ) : null}
    </form>
  )
}

function ResultSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-2 pb-1">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      {children}
    </div>
  )
}

function ResultRow({
  label,
  sub,
  active,
  onHover,
  onSelect,
}: {
  label: string
  sub?: string
  active: boolean
  onHover: () => void
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`flex w-full flex-col rounded-lg px-3 py-2 text-left transition ${
        active ? 'bg-blue-500/15 text-white' : 'text-slate-200 hover:bg-white/5'
      }`}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      <span className="truncate text-sm font-medium">{label}</span>
      {sub ? <span className="truncate text-xs text-slate-400">{sub}</span> : null}
    </button>
  )
}
