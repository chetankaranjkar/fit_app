import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppLoader } from '../components/ui/AppLoader'
import { HelpAppShell } from '../modules/help/HelpAppShell'
import { RequireAuth } from '../features/auth/components/RequireAuth'
import { DashboardShell } from '../features/auth/components/DashboardShell'

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
const DashboardHubPage = lazy(() =>
  import('../pages/dashboards/DashboardHubPage').then((m) => ({ default: m.DashboardHubPage })),
)
const MemberWorkoutsPage = lazy(() =>
  import('../pages/member/MemberWorkoutsPage').then((m) => ({ default: m.MemberWorkoutsPage })),
)
const TodayWorkoutPage = lazy(() =>
  import('../modules/workout-tracking').then((m) => ({ default: m.TodayWorkoutPage })),
)
const LiveWorkoutPage = lazy(() =>
  import('../modules/workout-tracking').then((m) => ({ default: m.LiveWorkoutPage })),
)
const MemberDietPage = lazy(() =>
  import('../pages/member/MemberDietPage').then((m) => ({ default: m.MemberDietPage })),
)
const MemberProgressPage = lazy(() =>
  import('../pages/member/MemberProgressPage').then((m) => ({ default: m.MemberProgressPage })),
)
const MemberProfilePage = lazy(() =>
  import('../pages/member/MemberProfilePage').then((m) => ({ default: m.MemberProfilePage })),
)
const MemberHealthProfilePage = lazy(() =>
  import('../pages/member/MemberHealthProfilePage').then((m) => ({ default: m.MemberHealthProfilePage })),
)
const MemberPortalPage = lazy(() =>
  import('../pages/member/MemberPortalPage').then((m) => ({ default: m.MemberPortalPage })),
)
const UserHealthProfilePage = lazy(() =>
  import('../pages/health/UserHealthProfilePage').then((m) => ({ default: m.UserHealthProfilePage })),
)
const SupplementMasterPage = lazy(() =>
  import('../modules/supplement-tracking').then((m) => ({ default: m.SupplementMasterPage })),
)
const UserSupplementsPage = lazy(() =>
  import('../modules/supplement-tracking').then((m) => ({ default: m.UserSupplementsPage })),
)
const MemberSupplementsPage = lazy(() =>
  import('../modules/supplement-tracking').then((m) => ({ default: m.MemberSupplementsPage })),
)
const ReceptionCrmPage = lazy(() =>
  import('../pages/reception/ReceptionCrmPage').then((m) => ({ default: m.ReceptionCrmPage })),
)
const UsersPage = lazy(() =>
  import('../pages/UsersPage').then((m) => ({ default: m.UsersPage })),
)
const AttendancePage = lazy(() =>
  import('../pages/AttendancePage').then((m) => ({ default: m.AttendancePage })),
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
const CollectMembershipPaymentPage = lazy(() =>
  import('../pages/CollectMembershipPaymentPage').then((m) => ({ default: m.CollectMembershipPaymentPage })),
)
const CouponsPage = lazy(() =>
  import('../pages/CouponsPage').then((m) => ({ default: m.CouponsPage })),
)

// Retail / POS module
const RetailProductsPage = lazy(() =>
  import('../modules/retail').then((m) => ({ default: m.ProductsPage })),
)
const RetailCategoriesPage = lazy(() =>
  import('../modules/retail').then((m) => ({ default: m.ProductCategoriesPage })),
)
const RetailPosPage = lazy(() =>
  import('../modules/retail').then((m) => ({ default: m.PosPage })),
)
const RetailPosOrdersPage = lazy(() =>
  import('../modules/retail').then((m) => ({ default: m.PosOrdersPage })),
)
const RetailInventoryAlertsPage = lazy(() =>
  import('../modules/retail').then((m) => ({ default: m.InventoryAlertsPage })),
)

const PtDashboardPage = lazy(() =>
  import('../modules/personal-training').then((m) => ({ default: m.PtDashboardPage })),
)
const PtPackagesPage = lazy(() =>
  import('../modules/personal-training').then((m) => ({ default: m.PtPackagesPage })),
)
const PtAssignPackagePage = lazy(() =>
  import('../modules/personal-training').then((m) => ({ default: m.PtAssignPackagePage })),
)
const PtSessionsPage = lazy(() =>
  import('../modules/personal-training').then((m) => ({ default: m.PtSessionsPage })),
)
const PtReportsPage = lazy(() =>
  import('../modules/personal-training').then((m) => ({ default: m.PtReportsPage })),
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
const ExerciseManagementPage = lazy(() =>
  import('../modules/exercise-management').then((m) => ({
    default: m.ExerciseManagementPage,
  })),
)
const WorkoutStudioPage = lazy(() =>
  import('../modules/workout-studio').then((m) => ({
    default: m.WorkoutStudioPage,
  })),
)
const WorkoutPlanBuilderPage = lazy(() =>
  import('../modules/workout-plan-builder').then((m) => ({
    default: m.WorkoutPlanBuilderPage,
  })),
)
const ProgramsPage = lazy(() =>
  import('../pages/training/ProgramsPage').then((m) => ({
    default: m.ProgramsPage,
  })),
)
const ProgramDetailPage = lazy(() =>
  import('../pages/training/ProgramDetailPage').then((m) => ({
    default: m.ProgramDetailPage,
  })),
)
const WorkoutAssignmentsPage = lazy(() =>
  import('../pages/training/WorkoutAssignmentsPage').then((m) => ({
    default: m.WorkoutAssignmentsPage,
  })),
)
const TrainerMemberWorkoutTimelinePage = lazy(() =>
  import('../pages/training/TrainerMemberWorkoutTimelinePage').then((m) => ({
    default: m.TrainerMemberWorkoutTimelinePage,
  })),
)
const WorkoutAdminMonitoringPage = lazy(() =>
  import('../pages/training/WorkoutAdminMonitoringPage').then((m) => ({
    default: m.WorkoutAdminMonitoringPage,
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
const BranchesPage = lazy(() =>
  import('../pages/BranchesPage').then((m) => ({ default: m.BranchesPage })),
)
const OwnerQrDashboard = lazy(() =>
  import('../pages/OwnerQrDashboard').then((m) => ({ default: m.OwnerQrDashboard })),
)
const ScanPage = lazy(() =>
  import('../pages/scan/ScanPage').then((m) => ({ default: m.ScanPage })),
)
const HelpCenterPage = lazy(() =>
  import('../modules/help/pages/HelpCenterPage').then((m) => ({ default: m.HelpCenterPage })),
)
const HelpCategoryPage = lazy(() =>
  import('../modules/help/pages/HelpCategoryPage').then((m) => ({ default: m.HelpCategoryPage })),
)
const HelpArticlePage = lazy(() =>
  import('../modules/help/pages/HelpArticlePage').then((m) => ({ default: m.HelpArticlePage })),
)

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<AppLoader />}>{node}</Suspense>
}

const router = createBrowserRouter([
  {
    element: <HelpAppShell />,
    children: [
      { path: '/', element: withSuspense(<LandingPage />) },
      { path: '/login', element: withSuspense(<LoginPage />) },
      { path: '/help', element: withSuspense(<HelpCenterPage />) },
      { path: '/help/category/:categoryId', element: withSuspense(<HelpCategoryPage />) },
      { path: '/help/article/:articleId', element: withSuspense(<HelpArticlePage />) },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <DashboardShell />,
            children: [
              { path: '/dashboard', element: withSuspense(<DashboardHubPage />) },
              { path: '/dashboard/reception', element: withSuspense(<ReceptionCrmPage />) },
              { path: '/dashboard/users', element: withSuspense(<UsersPage />) },
              { path: '/dashboard/attendance', element: withSuspense(<AttendancePage />) },
              { path: '/dashboard/users/:userId', element: withSuspense(<UserDetailPage />) },
              { path: '/dashboard/users/:userId/health-profile', element: withSuspense(<UserHealthProfilePage />) },
              { path: '/dashboard/users/:userId/supplements', element: withSuspense(<UserSupplementsPage />) },
              { path: '/dashboard/supplements/master', element: withSuspense(<SupplementMasterPage />) },
              { path: '/dashboard/member/supplements', element: withSuspense(<MemberSupplementsPage />) },
              { path: '/dashboard/membership-plans', element: withSuspense(<MembershipPlansPage />) },
              { path: '/dashboard/user-memberships', element: withSuspense(<UserMembershipsPage />) },
              { path: '/dashboard/payments', element: withSuspense(<PaymentsPage />) },
              { path: '/dashboard/payments/collect', element: withSuspense(<CollectMembershipPaymentPage />) },
              { path: '/dashboard/coupons', element: withSuspense(<CouponsPage />) },
              { path: '/dashboard/retail/products', element: withSuspense(<RetailProductsPage />) },
              { path: '/dashboard/retail/categories', element: withSuspense(<RetailCategoriesPage />) },
              { path: '/dashboard/retail/pos', element: withSuspense(<RetailPosPage />) },
              { path: '/dashboard/retail/orders', element: withSuspense(<RetailPosOrdersPage />) },
              { path: '/dashboard/retail/alerts', element: withSuspense(<RetailInventoryAlertsPage />) },
              { path: '/dashboard/personal-training', element: withSuspense(<PtDashboardPage />) },
              { path: '/dashboard/personal-training/packages', element: withSuspense(<PtPackagesPage />) },
              { path: '/dashboard/personal-training/assign', element: withSuspense(<PtAssignPackagePage />) },
              { path: '/dashboard/personal-training/sessions', element: withSuspense(<PtSessionsPage />) },
              { path: '/dashboard/personal-training/reports', element: withSuspense(<PtReportsPage />) },
              { path: '/dashboard/roles', element: withSuspense(<RolesPage />) },
              { path: '/dashboard/security', element: withSuspense(<SecurityPage />) },
              { path: '/dashboard/trainers', element: withSuspense(<TrainersPage />) },
              { path: '/dashboard/trainers/:trainerId', element: withSuspense(<TrainerDetailPage />) },
              { path: '/dashboard/profile', element: withSuspense(<MemberProfilePage />) },
              { path: '/dashboard/member/workouts', element: withSuspense(<MemberWorkoutsPage />) },
              { path: '/dashboard/member/workouts/today', element: withSuspense(<TodayWorkoutPage />) },
              { path: '/dashboard/member/workouts/live', element: withSuspense(<LiveWorkoutPage />) },
              { path: '/dashboard/member/diet', element: withSuspense(<MemberDietPage />) },
              { path: '/dashboard/member/progress', element: withSuspense(<MemberProgressPage />) },
              { path: '/dashboard/member/portal', element: withSuspense(<MemberPortalPage />) },
              { path: '/dashboard/member/health-profile', element: withSuspense(<MemberHealthProfilePage />) },
              { path: '/dashboard/training/body-parts', element: withSuspense(<BodyPartsPage />) },
              { path: '/dashboard/training/exercises', element: withSuspense(<ExercisesPage />) },
              {
                path: '/dashboard/training/exercises-premium',
                element: withSuspense(<ExerciseManagementPage />),
              },
              { path: '/dashboard/training/workout-studio', element: withSuspense(<WorkoutStudioPage />) },
              {
                path: '/dashboard/training/workout-plan-builder',
                element: withSuspense(<WorkoutPlanBuilderPage />),
              },
              { path: '/dashboard/training/programs', element: withSuspense(<ProgramsPage />) },
              {
                path: '/dashboard/training/programs/:programId',
                element: withSuspense(<ProgramDetailPage />),
              },
              {
                path: '/dashboard/training/workout-plans',
                element: <Navigate to="/dashboard/training/programs" replace />,
              },
              {
                path: '/dashboard/training/workout-assignments',
                element: withSuspense(<WorkoutAssignmentsPage />),
              },
              {
                path: '/dashboard/training/member-workouts/:memberId',
                element: withSuspense(<TrainerMemberWorkoutTimelinePage />),
              },
              {
                path: '/dashboard/training/workout-monitoring',
                element: withSuspense(<WorkoutAdminMonitoringPage />),
              },
              { path: '/dashboard/diet-plans', element: withSuspense(<DietPlansDashboardPage />) },
              { path: '/dashboard/diet-plans/list', element: withSuspense(<DietPlansPage />) },
              { path: '/dashboard/diet-plans/assign', element: withSuspense(<AssignDietPlansPage />) },
              { path: '/dashboard/gym-operations/equipment', element: withSuspense(<EquipmentPage />) },
              { path: '/dashboard/gym-operations/maintenance', element: withSuspense(<MaintenancePage />) },
              { path: '/dashboard/gym-operations/expenses', element: withSuspense(<ExpensesPage />) },
              { path: '/dashboard/gym-operations/cleaning', element: withSuspense(<CleaningPage />) },
              { path: '/dashboard/gym-operations/vendors', element: withSuspense(<VendorsPage />) },
              { path: '/dashboard/gym-operations/reports', element: withSuspense(<GymOpsReportsPage />) },
              { path: '/dashboard/locker-management/lockers', element: withSuspense(<LockersPage />) },
              { path: '/dashboard/locker-management/assignments', element: withSuspense(<AssignmentsPage />) },
              { path: '/dashboard/locker-management/access-logs', element: withSuspense(<AccessLogsPage />) },
              {
                path: '/dashboard/locker-management/maintenance',
                element: withSuspense(<LockerMaintenancePage />),
              },
              { path: '/dashboard/locker-management/reports', element: withSuspense(<LockerReportsPage />) },
              { path: '/dashboard/owner-analytics', element: withSuspense(<OwnerAnalyticsPage />) },
              { path: '/dashboard/access/branches', element: withSuspense(<BranchesPage />) },
              { path: '/dashboard/access/owner-qr', element: withSuspense(<OwnerQrDashboard />) },
              { path: '/dashboard/access/scan', element: withSuspense(<ScanPage />) },
            ],
          },
        ],
      },
    ],
  },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}
