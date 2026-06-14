import type { ReactNode } from 'react'

export function MembersDirectoryListHeader({
  eyebrow,
  title,
  memberCountLabel,
  toolbar,
}: {
  eyebrow: string
  title: string
  memberCountLabel: string
  toolbar: ReactNode
}) {
  return (
    <div className="shrink-0 border-b border-white/[0.07] bg-[linear-gradient(180deg,rgba(139,92,246,0.06)_0%,rgba(255,255,255,0.02)_40%,transparent_100%)] px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">{eyebrow}</p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight text-white sm:text-xl">{title}</h2>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-violet-400/20 bg-black/40 px-3 py-1 text-[11px] font-semibold text-slate-200 backdrop-blur-sm">
            {memberCountLabel}
          </span>
        </div>
        {toolbar}
      </div>
    </div>
  )
}

export function TrainerMembersListHeader({
  memberCountLabel,
  toolbar,
}: {
  memberCountLabel: string
  toolbar: ReactNode
}) {
  return (
    <MembersDirectoryListHeader
      eyebrow="Member directory"
      title="Your Members"
      memberCountLabel={memberCountLabel}
      toolbar={toolbar}
    />
  )
}
