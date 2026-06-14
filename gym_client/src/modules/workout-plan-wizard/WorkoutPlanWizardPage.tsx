import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { DashboardSubpageShell } from '../../components/layout/DashboardSubpageShell'
import { Button } from '../../components/ui/Button'
import { exercisesService } from '../../services/exercises.service'
import { programsService } from '../../services/workoutPlans.service'
import { stretchesService } from '../../services/stretches.service'
import { warmupsService } from '../../services/warmups.service'
import { workoutCategoriesService } from '../../services/workoutCategories.service'
import type { CreateWorkoutPlanDto } from '../../types/workoutPlan'
import { StepBasicInfo } from './components/StepBasicInfo'
import { StepPreview } from './components/StepPreview'
import { StepTemplateBuilder } from './components/StepTemplateBuilder'
import type { WizardBasicInfo, WizardStep, WizardWeekDraft } from './types'
import { buildTemplateWeeks, computeSummary, toStructurePayload } from './utils'

const defaultBasic: WizardBasicInfo = {
  name: '',
  description: '',
  goal: 'Muscle Gain',
  difficultyLevel: 'Beginner',
  durationDays: 90,
  workoutsPerWeek: 4,
  workoutType: 'Strength',
  templateMode: 'SIMPLE',
  templateWeekCount: 1,
  workoutCategoryId: 0,
  useDefaultWarmups: true,
  useDefaultStretches: true,
  isPublic: false,
}

function getDashboardUser() {
  try {
    const userJson = localStorage.getItem('user')
    if (!userJson) return { userName: 'User' }
    const user = JSON.parse(userJson) as { fullName?: string; username?: string }
    return { userName: user?.fullName?.trim() || user?.username?.trim() || 'User' }
  } catch {
    return { userName: 'User' }
  }
}

export function WorkoutPlanWizardPage() {
  const { userName } = getDashboardUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<WizardStep>(1)
  const [basic, setBasic] = useState<WizardBasicInfo>(defaultBasic)
  const [weeks, setWeeks] = useState<WizardWeekDraft[]>(() => buildTemplateWeeks('SIMPLE', 1))

  const { data: categories = [] } = useQuery({
    queryKey: ['workout-categories'],
    queryFn: async () => {
      const { data } = await workoutCategoriesService.getAll()
      return Array.isArray(data) ? data.filter((c) => c.isActive) : []
    },
  })

  const { data: exercises = [] } = useQuery({
    queryKey: ['wizard-exercises'],
    queryFn: async () => {
      const { data } = await exercisesService.getPaged({ page: 1, pageSize: 200 })
      return data.items ?? []
    },
  })

  const { data: warmups = [] } = useQuery({
    queryKey: ['wizard-warmups'],
    queryFn: async () => {
      const { data } = await warmupsService.getPaged({ page: 1, pageSize: 100 })
      return data.items ?? []
    },
  })

  const { data: stretches = [] } = useQuery({
    queryKey: ['wizard-stretches'],
    queryFn: async () => {
      const { data } = await stretchesService.getPaged({ page: 1, pageSize: 100 })
      return data.items ?? []
    },
  })

  useEffect(() => {
    setWeeks(buildTemplateWeeks(basic.templateMode, basic.templateWeekCount))
  }, [basic.templateMode, basic.templateWeekCount])

  useEffect(() => {
    if (categories.length === 0) return
    setBasic((b) => (b.workoutCategoryId > 0 ? b : { ...b, workoutCategoryId: categories[0].id }))
  }, [categories])

  const summary = useMemo(() => computeSummary(basic, weeks), [basic, weeks])
  const categoryName = categories.find((c) => c.id === basic.workoutCategoryId)?.name

  const saveMutation = useMutation({
    mutationFn: async () => {
      const createPayload: CreateWorkoutPlanDto = {
        name: basic.name.trim(),
        description: basic.description.trim() || null,
        goal: basic.goal,
        workoutType: basic.workoutType,
        duration: 50,
        durationDays: basic.durationDays,
        workoutsPerWeek: basic.workoutsPerWeek,
        difficultyLevel: basic.difficultyLevel,
        isPublic: basic.isPublic,
        status: 'Active',
        repeatTemplate: true,
        templateMode: basic.templateMode,
        templateWeekCount: basic.templateMode === 'SIMPLE' ? 1 : weeks.length,
        workoutCategoryId: basic.workoutCategoryId > 0 ? basic.workoutCategoryId : null,
        useDefaultWarmups: basic.useDefaultWarmups,
        useDefaultStretches: basic.useDefaultStretches,
        exercises: [],
      }
      const { data: plan } = await programsService.create(createPayload)
      await programsService.saveStructure(plan.id, toStructurePayload(basic, weeks))
      return plan
    },
    onSuccess: (plan) => {
      void queryClient.invalidateQueries({ queryKey: ['programs'] })
      toast.success('Workout plan created')
      navigate(`/dashboard/training/programs/${plan.id}?tab=schedule`)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create plan'),
  })

  function canNext(): boolean {
    if (step === 1) return basic.name.trim().length >= 2
    if (step === 2) {
      return weeks.some((w) => w.days.some((d) => d.isRestDay || d.focusArea === 'Rest Day' || d.exercises.length > 0))
    }
    return true
  }

  return (
    <DashboardLayout userName={userName}>
      <DashboardSubpageShell
        title="New workout plan"
        subtitle="Template-based program wizard — stores only template weeks, not 52 physical rows."
        backTo="/dashboard/training/programs"
      >
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {([1, 2, 3] as WizardStep[]).map((s) => (
            <div
              key={s}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                step === s ? 'bg-sky-500/20 text-sky-200' : step > s ? 'bg-white/10 text-slate-300' : 'bg-white/5 text-slate-500'
              }`}
            >
              {s === 1 ? 'Basics' : s === 2 ? 'Template' : 'Preview'}
            </div>
          ))}
        </div>

        {step === 1 && <StepBasicInfo value={basic} categories={categories} onChange={(p) => setBasic((b) => ({ ...b, ...p }))} />}
        {step === 2 && (
          <StepTemplateBuilder
            basic={basic}
            weeks={weeks}
            exercises={exercises}
            warmups={warmups}
            stretches={stretches}
            onWeeksChange={setWeeks}
          />
        )}
        {step === 3 && <StepPreview basic={basic} weeks={weeks} summary={summary} categoryName={categoryName} />}

        <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6">
          <Button variant="soft" disabled={step === 1} onClick={() => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s))}>
            Back
          </Button>
          <div className="flex gap-2">
            {step < 3 ? (
              <Button disabled={!canNext()} onClick={() => setStep((s) => ((s + 1) as WizardStep))}>
                Continue
              </Button>
            ) : (
              <Button isLoading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                Create plan
              </Button>
            )}
          </div>
        </div>
      </DashboardSubpageShell>
    </DashboardLayout>
  )
}
