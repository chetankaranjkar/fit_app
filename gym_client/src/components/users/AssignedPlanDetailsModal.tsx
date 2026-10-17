import { useQuery } from '@tanstack/react-query'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { dietPlansService } from '../../services/dietPlans.service'
import { workoutPlansService } from '../../services/workoutPlans.service'
import { getApiErrorMessage } from '../../lib/apiErrors'
import type { UserDietPlanDto } from '../../types/dietPlan'
import { DietPlanDetails } from './DietPlanDetails'
import { WorkoutPlanDetails } from './WorkoutPlanDetails'
import type { UserScheduleDto } from '../../types/userSchedule'

export type AssignedPlanSelection =
  | { kind: 'diet'; assignment: UserDietPlanDto }
  | { kind: 'workout'; schedule: UserScheduleDto }

export function AssignedPlanDetailsModal({ selection, onClose }: { selection: AssignedPlanSelection | null; onClose: () => void }) {
  const dietId = selection?.kind === 'diet' ? selection.assignment.dietPlanId : null
  const workoutId = selection?.kind === 'workout' ? selection.schedule.workoutPlanId : null
  const diet = useQuery({
    queryKey: ['diet-plan', dietId],
    queryFn: () => dietPlansService.getById(dietId!).then((r) => r.data),
    enabled: dietId != null,
  })
  const workout = useQuery({
    queryKey: ['program', workoutId],
    queryFn: () => workoutPlansService.getById(workoutId!).then((r) => r.data),
    enabled: workoutId != null,
  })
  const query = selection?.kind === 'diet' ? diet : workout
  return <Modal open={selection != null} onClose={onClose} title={selection?.kind === 'diet' ? 'Diet plan details' : 'Workout plan details'} size="wide" scrollable
    footer={<Button type="button" variant="secondary" onClick={onClose}>Back to profile</Button>}>
    <div className="space-y-4">
      {query.isLoading ? <p role="status" className="text-slate-300">Loading plan details…</p>
        : query.isError ? <div role="alert" className="space-y-3 text-rose-300">
          <p>{getApiErrorMessage(query.error, 'Could not load plan details.')}</p>
          <Button variant="secondary" onClick={() => void query.refetch()}>Retry</Button>
        </div>
        : selection?.kind === 'diet' && diet.data ? <DietPlanDetails plan={diet.data} assignment={selection.assignment} />
        : selection?.kind === 'workout' && workout.data ? <WorkoutPlanDetails plan={workout.data} schedule={selection.schedule} />
        : <p className="text-slate-400">Plan details are unavailable.</p>}
    </div>
  </Modal>
}
