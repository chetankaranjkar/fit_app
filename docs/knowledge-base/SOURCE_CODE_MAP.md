# Source code map

Quick pointers to implementation files referenced in the knowledge base. Paths are relative to repo root `GYM/`.

---

## Backend (`src/`)

| Area | Path |
|------|------|
| API entry | `src/GymManagement.API/Program.cs` |
| Users API | `src/GymManagement.API/Controllers/UsersController.cs` |
| Members API | `src/GymManagement.API/Controllers/MembersController.cs` |
| Staff API | `src/GymManagement.API/Controllers/StaffController.cs` |
| Trainers API | `src/GymManagement.API/Controllers/TrainersController.cs` |
| User orchestration | `src/GymManagement.Infrastructure/Services/UserService.cs` |
| Provisioning | `src/GymManagement.Infrastructure/Services/UserProvisioningService.cs` |
| Coach assignment | `src/GymManagement.Infrastructure/Services/UserInstructorService.cs` |
| Role codes | `src/GymManagement.Core/Authorization/ApplicationRoleCodes.cs` |
| Provisioning DTOs | `src/GymManagement.Core/DTOs/UserProvisioningDtos.cs` |
| EF context | `src/GymManagement.Infrastructure/Data/ApplicationDbContext.cs` |
| Migration (Members/Staff) | `src/GymManagement.Infrastructure/Migrations/20260525130244_AddMembersAndStaffProfiles.cs` |
| Trainer employee codes | `src/GymManagement.Infrastructure/Services/TrainerEmployeeCodeGenerator.cs` |
| Staff employee codes | `src/GymManagement.Infrastructure/Services/StaffEmployeeCodeGenerator.cs` |

---

## Frontend (`gym_client/src/`)

| Area | Path |
|------|------|
| Members list | `pages/UsersPage.tsx` |
| Member detail | `pages/UserDetailPage.tsx` |
| Trainers list | `pages/TrainersPage.tsx` |
| Trainer detail + edit modal | `pages/TrainerDetailPage.tsx` |
| Add trainer wizard | `components/trainers/AddTrainerModal.tsx` |
| Shared profile photo | `components/users/ProfilePhotoEditor.tsx` |
| Camera modal | `components/users/ProfilePhotoCameraModal.tsx` |
| Camera helpers | `lib/cameraMedia.ts` |
| API errors | `lib/apiErrors.ts` |
| Users HTTP | `services/users.service.ts` |
| Trainers HTTP | `services/trainers.service.ts` |
| File upload | `services/fileUpload.service.ts` |
| Legacy mock trainers UI (avoid) | `modules/trainers-management/` |

---

## Documentation

| Area | Path |
|------|------|
| This folder | `docs/knowledge-base/` |
| Deployment | `DEPLOYMENT.md` (repo root) |
