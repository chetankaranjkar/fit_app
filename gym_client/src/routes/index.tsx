import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLoader } from '../components/ui/AppLoader'

/**
 * All route components are code-split via `React.lazy` so Vite's dev server
 * only transforms (and the browser only downloads) the chunk for the page
 * currently being visited. This dramatically reduces first-paint work because
 * heavy deps like `three`, `@react-three/*`, `locomotive-scroll`, `recharts`
 * and `xlsx` are no longer pulled into every route's module graph.
 *
 * Each `lazy(() => import(...))` targets the same named export using the
 * `.then(...)` shim so we don't need to change any page file.
 */

const LandingPage = lazy(() =>
  import('../pages/LandingPage').then((m) => ({ default: m.LandingPage })),
)
const LoginPage = lazy(() =>
  import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const UsersPage = lazy(() =>
  import('../pages/UsersPage').then((m) => ({ default: m.UsersPage })),
)
const UserDetailPage = lazy(() =>
  import('../pages/UserDetailPage').then((m) => ({ default: m.UserDetailPage })),
)
const MembershipPlansPage = lazy(() =>
  import('../pages/MembershipPlansPage').then((m) => ({
    default: m.MembershipPlansPage,
  })),
)
const UserMembershipsPage = lazy(() =>
  import('../pages/UserMembershipsPage').then((m) => ({
    default: m.UserMembershipsPage,
  })),
)
const PaymentsPage = lazy(() =>
  import('../pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
)
const BodyPartsPage = lazy(() =>
  import('../pages/training/BodyPartsPage').then((m) => ({
    default: m.BodyPartsPage,
  })),
)
const ExercisesPage = lazy(() =>
  import('../pages/training/ExercisesPage').then((m) => ({
    default: m.ExercisesPage,
  })),
)
const WorkoutPlansPage = lazy(() =>
  import('../pages/training/WorkoutPlansPage').then((m) => ({
    default: m.WorkoutPlansPage,
  })),
)
const RolesPage = lazy(() =>
  import('../pages/RolesPage').then((m) => ({ default: m.RolesPage })),
)
const TrainersPage = lazy(() =>
  import('../pages/TrainersPage').then((m) => ({ default: m.TrainersPage })),
)
const TrainerDetailPage = lazy(() =>
  import('../pages/TrainerDetailPage').then((m) => ({
    default: m.TrainerDetailPage,
  })),
)
const DietPlansPage = lazy(() =>
  import('../pages/DietPlansPage').then((m) => ({ default: m.DietPlansPage })),
)
const DietPlansDashboardPage = lazy(() =>
  import('../pages/DietPlansDashboardPage').then((m) => ({
    default: m.DietPlansDashboardPage,
  })),
)
const AssignDietPlansPage = lazy(() =>
  import('../pages/AssignDietPlansPage').then((m) => ({
    default: m.AssignDietPlansPage,
  })),
)
const SecurityPage = lazy(() =>
  import('../pages/SecurityPage').then((m) => ({ default: m.SecurityPage })),
)

// Gym Operations module
const EquipmentPage = lazy(() =>
  import('../modules/gym-operations').then((m) => ({ default: m.EquipmentPage })),
)
const MaintenancePage = lazy(() =>
  import('../modules/gym-operations').then((m) => ({ default: m.MaintenancePage })),
)
const ExpensesPage = lazy(() =>
  import('../modules/gym-operations').then((m) => ({ default: m.ExpensesPage })),
)
const CleaningPage = lazy(() =>
  import('../modules/gym-operations').then((m) => ({ default: m.CleaningPage })),
)
const VendorsPage = lazy(() =>
  import('../modules/gym-operations').then((m) => ({ default: m.VendorsPage })),
)
const GymOpsReportsPage = lazy(() =>
  import('../modules/gym-operations').then((m) => ({ default: m.ReportsPage })),
)

// Locker Management module
const LockersPage = lazy(() =>
  import('../modules/locker-management').then((m) => ({ default: m.LockersPage })),
)
const AssignmentsPage = lazy(() =>
  import('../modules/locker-management').then((m) => ({ default: m.AssignmentsPage })),
)
const AccessLogsPage = lazy(() =>
  import('../modules/locker-management').then((m) => ({ default: m.AccessLogsPage })),
)
const LockerMaintenancePage = lazy(() =>
  import('../modules/locker-management').then((m) => ({
    default: m.LockerMaintenancePage,
  })),
)
const LockerReportsPage = lazy(() =>
  import('../modules/locker-management').then((m) => ({
    default: m.LockerReportsPage,
  })),
)

// Owner Analytics module
const OwnerAnalyticsPage = lazy(() =>
  import('../modules/owner-analytics').then((m) => ({ default: m.OwnerAnalyticsPage })),
)

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<AppLoader />}>{node}</Suspense>
}

const router = createBrowserRouter([
  { path: '/', element: withSuspense(<LandingPage />) },
  { path: '/login', element: withSuspense(<LoginPage />) },
  { path: '/dashboard', element: withSuspense(<DashboardPage />) },
  { path: '/dashboard/users', element: withSuspense(<UsersPage />) },
  { path: '/dashboard/users/:userId', element: withSuspense(<UserDetailPage />) },
  { path: '/dashboard/membership-plans', element: withSuspense(<MembershipPlansPage />) },
  { path: '/dashboard/user-memberships', element: withSuspense(<UserMembershipsPage />) },
  { path: '/dashboard/payments', element: withSuspense(<PaymentsPage />) },
  { path: '/dashboard/roles', element: withSuspense(<RolesPage />) },
  { path: '/dashboard/security', element: withSuspense(<SecurityPage />) },
  { path: '/dashboard/trainers', element: withSuspense(<TrainersPage />) },
  { path: '/dashboard/trainers/:trainerId', element: withSuspense(<TrainerDetailPage />) },
  { path: '/dashboard/profile', element: withSuspense(<DashboardPage />) },
  { path: '/dashboard/training/body-parts', element: withSuspense(<BodyPartsPage />) },
  { path: '/dashboard/training/exercises', element: withSuspense(<ExercisesPage />) },
  { path: '/dashboard/training/workout-plans', element: withSuspense(<WorkoutPlansPage />) },
  { path: '/dashboard/diet-plans', element: withSuspense(<DietPlansDashboardPage />) },
  { path: '/dashboard/diet-plans/list', element: withSuspense(<DietPlansPage />) },
  { path: '/dashboard/diet-plans/assign', element: withSuspense(<AssignDietPlansPage />) },
  // Gym Operations module (isolated; all routes mount under /dashboard)
  { path: '/dashboard/gym-operations/equipment', element: withSuspense(<EquipmentPage />) },
  { path: '/dashboard/gym-operations/maintenance', element: withSuspense(<MaintenancePage />) },
  { path: '/dashboard/gym-operations/expenses', element: withSuspense(<ExpensesPage />) },
  { path: '/dashboard/gym-operations/cleaning', element: withSuspense(<CleaningPage />) },
  { path: '/dashboard/gym-operations/vendors', element: withSuspense(<VendorsPage />) },
  { path: '/dashboard/gym-operations/reports', element: withSuspense(<GymOpsReportsPage />) },
  // Locker Management module (isolated; all routes mount under /dashboard)
  { path: '/dashboard/locker-management/lockers', element: withSuspense(<LockersPage />) },
  { path: '/dashboard/locker-management/assignments', element: withSuspense(<AssignmentsPage />) },
  { path: '/dashboard/locker-management/access-logs', element: withSuspense(<AccessLogsPage />) },
  { path: '/dashboard/locker-management/maintenance', element: withSuspense(<LockerMaintenancePage />) },
  { path: '/dashboard/locker-management/reports', element: withSuspense(<LockerReportsPage />) },
  // Owner Analytics module (isolated; drill-down drawer UX)
  { path: '/dashboard/owner-analytics', element: withSuspense(<OwnerAnalyticsPage />) },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}
