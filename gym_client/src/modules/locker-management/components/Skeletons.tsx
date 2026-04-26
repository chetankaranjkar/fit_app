/**
 * Skeleton shimmer primitives scoped to the Locker Management module.
 * Uses tailwind's built-in `animate-pulse` plus an inline gradient sweep so we
 * don't touch global CSS.
 */

function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-white/[0.04] ${className}`}
      style={style}
      aria-hidden
    >
      <div
        className="absolute inset-0 animate-[lkmShimmer_1.4s_ease-in-out_infinite]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        }}
      />
      <style>{`@keyframes lkmShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-card dashboard-card min-w-0 rounded-2xl p-4 ${className}`}>
      <Shimmer className="h-3 w-24" />
      <Shimmer className="mt-2 h-7 w-16" />
      <Shimmer className="mt-3 h-1 w-10" />
    </div>
  )
}

export function SkeletonKpiRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="px-6 py-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="mb-2 flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
        >
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-3 w-16" />
          <Shimmer className="h-3 flex-1" />
          <Shimmer className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonGrid({ tiles = 12 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 p-6">
      {Array.from({ length: tiles }).map((_, i) => (
        <Shimmer key={i} className="h-[132px] rounded-2xl" />
      ))}
    </div>
  )
}

export function SkeletonTimeline({ rows = 5 }: { rows?: number }) {
  return (
    <div className="px-6 py-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="mb-3 flex items-start gap-3">
          <Shimmer className="mt-1 size-3 rounded-full" />
          <Shimmer className="h-4 flex-1" />
        </div>
      ))}
    </div>
  )
}
