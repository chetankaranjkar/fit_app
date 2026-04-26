import { motion } from 'framer-motion'
import type { Exercise } from '../types'

export function ExerciseCard({
  exercise,
  onClick,
}: {
  exercise: Exercise
  onClick: () => void
}) {
  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      type="button"
      onClick={onClick}
      className="glass-card dashboard-card group w-full overflow-hidden rounded-2xl text-left transition-shadow hover:shadow-[0_16px_40px_-24px_rgba(59,130,246,0.65)]"
    >
      <div className="relative h-36 w-full overflow-hidden bg-slate-900">
        {exercise.imageUrl ? (
          <img
            src={exercise.imageUrl}
            alt={exercise.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            No image
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 text-base font-semibold text-white">{exercise.name}</h3>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300">
            {exercise.muscleGroupPrimary || 'General'}
          </span>
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">
            {exercise.difficulty || 'N/A'}
          </span>
        </div>
      </div>
    </motion.button>
  )
}
