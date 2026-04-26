interface SkeletonProps {
  className?: string
  variant?: 'default' | 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className = '',
  variant = 'default',
  width,
  height,
  animation = 'wave',
}: SkeletonProps) {
  const baseStyles =
    'bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]'

  const variantStyles = {
    default: 'rounded-xl',
    text: 'rounded h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  const style: React.CSSProperties = {
    width: width,
    height: height ?? (variant === 'text' ? '1rem' : undefined),
  }

  const animClass =
    animation === 'wave' ? 'animate-shimmer' : animation === 'pulse' ? 'animate-pulse' : ''

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${animClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="mb-2 h-4 w-24" variant="text" animation="wave" />
          <Skeleton className="h-7 w-16" variant="default" animation="wave" />
        </div>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="glass-card min-w-0 rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-6 w-48" variant="text" />
        <Skeleton className="h-8 w-24" variant="default" />
      </div>
      <div className="h-72">
        <div className="flex h-full items-end justify-between gap-1 px-4 py-8">
          {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
            <div
              key={i}
              className="w-full rounded-t bg-white/5 animate-pulse"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="border-b border-white/5 bg-white/[0.02] p-4">
        <Skeleton className="h-5 w-48" variant="text" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-white/5 p-4 last:border-b-0">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" variant="text" />
            <Skeleton className="h-3 w-1/2" variant="text" />
          </div>
          <Skeleton className="h-8 w-20" variant="default" />
        </div>
      ))}
    </div>
  )
}
