export function isLiveWorkoutStatus(status: string) {
  return status === 'InProgress'
}

export function workoutStatusLabel(status: string) {
  if (status === 'InProgress') return 'Live'
  if (status === 'Completed') return 'Completed'
  if (status === 'Skipped') return 'Skipped'
  return status || 'Unknown'
}

export function workoutStatusClass(status: string) {
  if (isLiveWorkoutStatus(status)) {
    return 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
  }
  if (status === 'Completed') {
    return 'border border-white/10 bg-white/5 text-slate-300'
  }
  return 'border border-amber-400/30 bg-amber-500/10 text-amber-100'
}
