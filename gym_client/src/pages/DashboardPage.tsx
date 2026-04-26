import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { ClientsLineChart } from '../components/dashboard/ClientsLineChart'
import { MetricCardsRow } from '../components/dashboard/MetricCardsRow'
import { MonthlyRevenueCard } from '../components/dashboard/MonthlyRevenueCard'
import { TopTrainersCard } from '../components/dashboard/TopTrainersCard'
import { UpcomingClassesCard } from '../components/dashboard/UpcomingClassesCard'
import { BillingGraphsRow } from '../components/dashboard/BillingGraphsRow'
import { CompromisedSessionsCard } from '../components/dashboard/CompromisedSessionsCard'
import { NotificationCenterCard } from '../components/dashboard/NotificationCenterCard'
import { PermissionGate } from '../components/auth/PermissionGate'
import { authService } from '../services/auth.service'
import { reportsService } from '../services/reports.service'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    const userName = user?.fullName?.trim() || user?.username?.trim() || 'User'
    return { userName }
  } catch {
    return { userName: 'User' }
  }
}

export function DashboardPage() {
  const { userName } = getDashboardUser()
  const navigate = useNavigate()
  const contentRef = useRef<HTMLDivElement>(null)
  const cardsRowRef = useRef<HTMLDivElement>(null)
  const chartsRef = useRef<HTMLDivElement>(null)
  const bottomCardsRef = useRef<HTMLDivElement>(null)

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportDashboardReport = async () => {
    const now = new Date()
    const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const toDate = now.toISOString().slice(0, 10)
    const { data } = await reportsService.exportSummaryCsv(fromDate, toDate)
    downloadBlob(data, `dashboard-report-${fromDate}-${toDate}.csv`)
  }

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    // Shared ScrollTrigger defaults:
    // - `start: 'top bottom-=40'` fires as soon as any pixel of the trigger
    //   enters the viewport from the bottom, so cards that are already visible
    //   on initial load are animated immediately instead of being stuck at
    //   opacity 0 when trigger positions are cached before layout settles.
    // - `toggleActions` keeps the animation in its final state after firing.
    const inViewTrigger = (trigger: Element | null) => ({
      trigger: trigger ?? undefined,
      start: 'top bottom-=40',
      toggleActions: 'play none none none',
      once: true,
    })

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.dashboard-header',
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      )

      const cards = cardsRowRef.current?.querySelectorAll('.metric-card')
      if (cards && cards.length) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 40, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.08,
            ease: 'back.out(1.2)',
            scrollTrigger: inViewTrigger(cardsRowRef.current),
          }
        )
      }

      gsap.fromTo(
        chartsRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: inViewTrigger(chartsRef.current),
        }
      )

      const bottomCards = bottomCardsRef.current?.querySelectorAll('.dashboard-card')
      if (bottomCards && bottomCards.length) {
        gsap.fromTo(
          bottomCards,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: 'power2.out',
            scrollTrigger: inViewTrigger(bottomCardsRef.current),
          }
        )
      }

      const chartArea = document.querySelector('.recharts-area-curve')
      if (chartArea) {
        gsap.fromTo(
          chartArea,
          { strokeDasharray: 2000, strokeDashoffset: 2000 },
          {
            strokeDashoffset: 0,
            duration: 2,
            ease: 'power2.out',
            scrollTrigger: inViewTrigger(chartsRef.current),
          }
        )
      }
    }, contentRef)

    // Async content (recharts ResponsiveContainer, web fonts, images) can
    // shift layout after ScrollTrigger cached positions. Force refresh after
    // the next frame and again shortly after so triggers recompute correctly
    // and every card reliably animates in on first load.
    const rafId = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh()
    })
    const timeoutId = window.setTimeout(() => {
      ScrollTrigger.refresh()
    }, 350)

    // Final safety net: if after 1.5s a card is still stuck at opacity 0
    // (e.g. unrecoverable ScrollTrigger edge case), force it visible so the
    // user never has to resize the window to see Top Trainers / Monthly
    // Revenue / Notification Center / Compromised Sessions.
    const fallbackId = window.setTimeout(() => {
      const selectors = [
        '.metric-card',
        '.dashboard-card',
        '.dashboard-header',
      ]
      selectors.forEach((sel) => {
        contentRef.current?.querySelectorAll<HTMLElement>(sel).forEach((el) => {
          const style = window.getComputedStyle(el)
          if (parseFloat(style.opacity) < 0.05) {
            gsap.set(el, { clearProps: 'opacity,transform' })
            gsap.to(el, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
          }
        })
      })
      ScrollTrigger.refresh()
    }, 1500)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
      window.clearTimeout(fallbackId)
      ctx.revert()
    }
  }, [])

  return (
    <DashboardLayout userName={userName}>
      <div ref={contentRef} className="min-w-0 max-w-[100%] space-y-6">
        {/* Page header */}
        <div className="dashboard-header flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Welcome back
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
              Hello,{' '}
              <span className="bg-[linear-gradient(135deg,#60a5fa,#c084fc)] bg-clip-text text-transparent">
                {userName}
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Here&apos;s what&apos;s happening at your gym today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void exportDashboardReport()
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem('gym_openAddMember', '1')
                } catch {
                  /* ignore */
                }
                navigate('/dashboard/users', { state: { openAddMember: true } })
              }}
              className="rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#a855f7_100%)] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:brightness-110"
            >
              + Add Member
            </button>
          </div>
        </div>

        {/* KPI metrics */}
        <div ref={cardsRowRef}>
          <MetricCardsRow />
        </div>

        {/* Main charts grid */}
        <div ref={chartsRef} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ClientsLineChart />
          </div>
          <div>
            <UpcomingClassesCard className="dashboard-card h-full" />
          </div>
        </div>

        {/* Bottom row */}
        <div ref={bottomCardsRef} className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
          <TopTrainersCard className="dashboard-card" />
          <MonthlyRevenueCard className="dashboard-card" />
          <NotificationCenterCard className="dashboard-card" />
          <PermissionGate permission={authService.permissionCodes.reports}>
            <CompromisedSessionsCard className="dashboard-card" />
          </PermissionGate>
        </div>

        {/* Appended bottom billing graphs */}
        <BillingGraphsRow />
      </div>
    </DashboardLayout>
  )
}
