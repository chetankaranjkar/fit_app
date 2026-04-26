import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import type { Exercise, ExerciseUpsertPayload } from '../types'

const stepNames = ['Basic Info', 'Details', 'Media'] as const

function parseEquipment(input: string) {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function ExerciseForm({
  initial,
  onSubmit,
  isSubmitting,
}: {
  initial?: Exercise | null
  onSubmit: (payload: ExerciseUpsertPayload) => void
  isSubmitting?: boolean
}) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [muscleGroupPrimary, setMuscleGroupPrimary] = useState(initial?.muscleGroupPrimary ?? '')
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 'Beginner')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [forceType, setForceType] = useState(initial?.forceType ?? '')
  const [mechanic, setMechanic] = useState(initial?.mechanic ?? '')
  const [equipmentInput, setEquipmentInput] = useState(initial?.equipment ?? '')
  const [isUnilateral, setIsUnilateral] = useState(Boolean(initial?.isUnilateral))
  const [isTimeBased, setIsTimeBased] = useState(Boolean(initial?.isTimeBased))
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '')
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? '')
  const [error, setError] = useState<string | null>(null)

  const payload = useMemo<ExerciseUpsertPayload>(
    () => ({
      name,
      category,
      muscleGroupPrimary,
      difficulty,
      description,
      forceType,
      mechanic,
      equipment: parseEquipment(equipmentInput),
      isUnilateral,
      isTimeBased,
      imageUrl,
      videoUrl,
    }),
    [
      name,
      category,
      muscleGroupPrimary,
      difficulty,
      description,
      forceType,
      mechanic,
      equipmentInput,
      isUnilateral,
      isTimeBased,
      imageUrl,
      videoUrl,
    ],
  )

  function handleSubmit() {
    if (!name.trim()) {
      setError('Exercise name is required.')
      setStep(0)
      return
    }
    if (!muscleGroupPrimary.trim()) {
      setError('Primary muscle group is required.')
      setStep(0)
      return
    }
    setError(null)
    onSubmit(payload)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {stepNames.map((nameLabel, index) => (
          <button
            key={nameLabel}
            type="button"
            onClick={() => setStep(index)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
              step === index
                ? 'bg-[linear-gradient(135deg,#3b82f6,#a855f7)] text-white'
                : 'bg-white/5 text-slate-300'
            }`}
          >
            {index + 1}. {nameLabel}
          </button>
        ))}
      </div>
      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {step === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input
            label="Primary Muscle Group"
            value={muscleGroupPrimary}
            onChange={(e) => setMuscleGroupPrimary(e.target.value)}
          />
          <Input label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Force Type" value={forceType} onChange={(e) => setForceType(e.target.value)} />
          <Input label="Mechanic" value={mechanic} onChange={(e) => setMechanic(e.target.value)} />
          <div className="sm:col-span-2">
            <Input
              label="Equipment (comma-separated)"
              value={equipmentInput}
              onChange={(e) => setEquipmentInput(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
            <input type="checkbox" checked={isUnilateral} onChange={(e) => setIsUnilateral(e.target.checked)} />
            Unilateral
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
            <input type="checkbox" checked={isTimeBased} onChange={(e) => setIsTimeBased(e.target.checked)} />
            Time Based
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <Input label="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <Input label="Video URL" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        </div>
      ) : null}

      <div className="flex justify-between">
        <Button variant="soft" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < stepNames.length - 1 ? (
          <Button onClick={() => setStep((s) => Math.min(stepNames.length - 1, s + 1))}>Next</Button>
        ) : (
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            {initial ? 'Save Exercise' : 'Create Exercise'}
          </Button>
        )}
      </div>
    </div>
  )
}
