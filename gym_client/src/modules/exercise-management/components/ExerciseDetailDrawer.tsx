import { motion } from 'framer-motion'
import { Modal } from '../../../components/ui/Modal'
import type { Exercise } from '../types'

export function ExerciseDetailDrawer({
  exercise,
  open,
  onClose,
}: {
  exercise: Exercise | null
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={exercise?.name || 'Exercise detail'} size="wide" scrollable>
      {!exercise ? null : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            {exercise.imageUrl ? (
              <img
                src={exercise.imageUrl}
                alt={exercise.name}
                loading="lazy"
                className="h-52 w-full object-cover"
              />
            ) : (
              <div className="flex h-52 items-center justify-center bg-slate-900 text-sm text-slate-500">
                No banner image
              </div>
            )}
          </div>

          {exercise.videoUrl ? (
            <div className="aspect-video overflow-hidden rounded-2xl border border-white/10">
              <iframe title={`${exercise.name} video`} src={exercise.videoUrl} className="h-full w-full" />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Overview</p>
              <p className="mt-2 text-sm text-slate-200">{exercise.description || 'No description.'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Details</p>
              <div className="mt-2 space-y-1 text-sm text-slate-200">
                <p>Category: {exercise.category || '-'}</p>
                <p>Muscle: {exercise.muscleGroupPrimary || '-'}</p>
                <p>Difficulty: {exercise.difficulty || '-'}</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Instructions</p>
              <div className="mt-2 space-y-1 text-sm text-slate-200">
                <p>Force: {exercise.forceType || '-'}</p>
                <p>Mechanic: {exercise.mechanic || '-'}</p>
                <p>Equipment: {exercise.equipment || '-'}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </Modal>
  )
}
