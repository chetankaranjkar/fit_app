using Microsoft.EntityFrameworkCore;
using GymManagement.Core.Authorization;
using GymManagement.Core.Interfaces;
using GymManagement.Domain.Entities;
using GymManagement.Domain.Entities.GymOps;
using GymManagement.Infrastructure.Security;
using GymManagement.Infrastructure.Services;

namespace GymManagement.Infrastructure.Data
{
    public class DatabaseSeeder
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ApplicationDbContext _context;

        public DatabaseSeeder(IUnitOfWork unitOfWork, ApplicationDbContext context)
        {
            _unitOfWork = unitOfWork;
            _context = context;
        }

        public async Task SeedAsync()
        {
            // Seed Roles (ADMIN, STAFF, TRAINER, MEMBER) — used by RolePermissions / UserRoles / RBAC
            await EnsureRolesExistAsync();
            await _unitOfWork.SaveChangesAsync();

            await EnsureDefaultOrganizationAsync();
            await _unitOfWork.SaveChangesAsync();

            // Seed default Admin (profile) + AuthUser (login)
            await SeedDefaultAdminAndAuthAsync();
            await _unitOfWork.SaveChangesAsync();

            // Seed Membership Plans (default plans) - save immediately so plans exist even if later seed fails
            await SeedMembershipPlansAsync();
            await _unitOfWork.SaveChangesAsync();

            // Seed User Types (Admin, Trainer, Staff, Member) for user type assignment
            await SeedUserTypesAsync();
            await _unitOfWork.SaveChangesAsync();

            // Ensure admin user (username/email admin@gym.com) has UserType Admin
            await EnsureAdminUserHasAdminTypeAsync();
            await _unitOfWork.SaveChangesAsync();

            // Seed default Instructors (trainers)
            await SeedInstructorsAsync();
            await _unitOfWork.SaveChangesAsync();

            // Ensure Alex Johnson and Sam Williams have UserType Trainer
            await EnsureInstructorUsersHaveTrainerTypeAsync();
            await _unitOfWork.SaveChangesAsync();

            // Seed Permissions (for role-permission system)
            await SeedPermissionsAsync();
            await _unitOfWork.SaveChangesAsync();

            // ADMIN role gets all permissions so permission-based APIs work for the default admin
            await EnsureAdminRoleHasAllPermissionsAsync();
            await _unitOfWork.SaveChangesAsync();

            await EnsureDefaultRoleLeadPermissionsAsync();
            await _unitOfWork.SaveChangesAsync();

            // Seed Body Parts
            var bodyParts = await SeedBodyPartsAsync();

            // Seed Body Part Muscles
            await SeedBodyPartMusclesAsync(bodyParts);

            // Seed Exercises
            var seededExerciseCount = await SeedExercisesAsync(bodyParts);

            // Seed Workout Plans
            await SeedWorkoutPlansAsync();
            await SeedPremiumProgramsAsync();

            // Seed Diet Plans (with meals and meal items)
            await SeedDietPlansAsync();

            await _unitOfWork.SaveChangesAsync();
            Console.WriteLine($"[Seeder] Exercises inserted in this run: {seededExerciseCount}");

            // Seed Gym Operations demo data (Equipment + MaintenanceLogs).
            // Kept isolated in GymOps tables; idempotent.
            await SeedGymOpsEquipmentAndMaintenanceAsync();
            await _context.SaveChangesAsync();

            await RetailDatabaseSeeder.SeedAsync(_context);
        }

        private async Task SeedUserTypesAsync()
        {
            // Rename existing "Instructor" to "Trainer" if present
            var instructor = await _unitOfWork.UserTypes.FirstOrDefaultAsync(ut => ut.Name == "Instructor");
            if (instructor != null)
            {
                instructor.Name = "Trainer";
                instructor.Description = "Trainer";
                _unitOfWork.UserTypes.Update(instructor);
                await _unitOfWork.SaveChangesAsync();
            }

            var types = new[]
            {
                new { Name = "Admin", Description = "Administrator with full access" },
                new { Name = "Trainer", Description = "Trainer or coach" },
                new { Name = "Staff", Description = "Gym staff member" },
                new { Name = "Member", Description = "Gym member" },
                new { Name = "Receptionist", Description = "Front desk / reception" },
                new { Name = "Accountant", Description = "Billing and accounts" },
            };
            foreach (var t in types)
            {
                var existing = await _unitOfWork.UserTypes.FirstOrDefaultAsync(ut => ut.Name == t.Name);
                if (existing == null)
                {
                    await _unitOfWork.UserTypes.AddAsync(new UserType
                    {
                        Name = t.Name,
                        Description = t.Description,
                        CreatedDate = DateTime.UtcNow
                    });
                }
            }
        }

        private async Task SeedMembershipPlansAsync()
        {
            var defaultPlans = new[]
            {
                new { PlanName = "Monthly", DurationDays = 30, Price = 49.99m, Description = "1 month access to gym facilities" },
                new { PlanName = "Quarterly", DurationDays = 90, Price = 129.99m, Description = "3 months access - save 13%" },
                new { PlanName = "Half Yearly", DurationDays = 180, Price = 229.99m, Description = "6 months access - save 23%" },
                new { PlanName = "Yearly", DurationDays = 365, Price = 399.99m, Description = "Full year access - best value" },
            };

            foreach (var data in defaultPlans)
            {
                var existing = await _unitOfWork.MembershipPlans
                    .FirstOrDefaultAsync(p => p.PlanName == data.PlanName);
                if (existing == null)
                {
                    var plan = new MembershipPlan
                    {
                        PlanName = data.PlanName,
                        DurationDays = data.DurationDays,
                        Price = data.Price,
                        Description = data.Description,
                        CreatedDate = DateTime.UtcNow,
                        IsDeleted = false
                    };
                    await _unitOfWork.MembershipPlans.AddAsync(plan);
                }
            }
        }

        private async Task SeedInstructorsAsync()
        {
            var defaultTrainers = new[]
            {
                new { FirstName = "Alex", LastName = "Johnson", Email = "alex.johnson@gym.com", Phone = (string?)null, Specialization = "Strength & Conditioning" },
                new { FirstName = "Sam", LastName = "Williams", Email = "sam.williams@gym.com", Phone = (string?)null, Specialization = "Cardio & Fitness" },
            };

            foreach (var data in defaultTrainers)
            {
                var existingUser = await _unitOfWork.Users
                    .FirstOrDefaultAsync(u => u.FirstName == data.FirstName && u.LastName == data.LastName);
                if (existingUser != null)
                {
                    var alreadyTrainer = await _unitOfWork.Trainers
                        .FirstOrDefaultAsync(i => i.UserId == existingUser.Id);
                    if (alreadyTrainer != null) continue;
                    var trainer = new Trainer
                    {
                        UserId = existingUser.Id,
                        EmployeeCode = $"EMP{existingUser.Id}",
                        Specialization = data.Specialization,
                        HireDate = DateTime.UtcNow,
                        IsActive = true
                    };
                    await _unitOfWork.Trainers.AddAsync(trainer);
                    continue;
                }
                var user = new User
                {
                    FirstName = data.FirstName,
                    LastName = data.LastName,
                    Phone = data.Phone,
                    DateOfBirth = new DateTime(1990, 1, 1),
                    Gender = "Other",
                    RegistrationDate = DateTime.UtcNow,
                    IsActive = true
                };
                await _unitOfWork.Users.AddAsync(user);
                await _unitOfWork.SaveChangesAsync();
                var newTrainer = new Trainer
                {
                    UserId = user.Id,
                    EmployeeCode = $"EMP{user.Id}",
                    Specialization = data.Specialization,
                    HireDate = DateTime.UtcNow,
                    IsActive = true
                };
                await _unitOfWork.Trainers.AddAsync(newTrainer);
            }
        }

        private async Task EnsureDefaultOrganizationAsync()
        {
            if (await _context.Organizations.AnyAsync())
                return;

            await _context.Organizations.AddAsync(new Organization
            {
                Name = "PulseFit Gym",
                OrganizationType = "Gym",
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
            });
        }

        /// <summary>
        /// Ensures canonical application roles exist in <c>Roles</c> (see migration seed: ADMIN, STAFF, TRAINER, MEMBER).
        /// </summary>
        private async Task EnsureRolesExistAsync()
        {
            var roleNames = new[] { "ADMIN", "STAFF", "TRAINER", "MEMBER", "RECEPTIONIST", "ACCOUNTANT" };
            foreach (var name in roleNames)
            {
                var exists = await _unitOfWork.AppRoles.FirstOrDefaultAsync(r => r.Name == name);
                if (exists == null)
                {
                    await _unitOfWork.AppRoles.AddAsync(new AppRole
                    {
                        Name = name,
                        Description = name,
                        IsActive = true,
                        CreatedDate = DateTime.UtcNow
                    });
                }
            }
        }

        /// <summary>
        /// Seed default admin: a User record (so admin appears in Users table) + AuthUser (login email <c>admin@gym.com</c>, password <c>admin123</c>).
        /// </summary>
        private async Task SeedDefaultAdminAndAuthAsync()
        {
            var adminRole = await _unitOfWork.AppRoles.FirstOrDefaultAsync(r => r.Name == "ADMIN");
            if (adminRole == null) return; // EnsureRolesExistAsync must run first

            // Ensure a User (member) record exists for the admin so they appear in the Users table (email lives on AuthUser)
            var adminUser = await _unitOfWork.Users.FirstOrDefaultAsync(u =>
                u.FirstName == "Admin" && u.LastName == "User");
            if (adminUser == null)
            {
                adminUser = new User
                {
                    FirstName = "Admin",
                    LastName = "User",
                    DateOfBirth = new DateTime(1990, 1, 1),
                    Gender = "Other",
                    RegistrationDate = DateTime.UtcNow,
                    IsActive = true
                };
                await _unitOfWork.Users.AddAsync(adminUser);
                await _unitOfWork.SaveChangesAsync(); // So we have adminUser.Id
            }

            var existingAuth = await _unitOfWork.AuthUsers
                .FirstOrDefaultAsync(a => a.Email.ToLower() == "admin@gym.com");
            if (existingAuth != null)
            {
                // Link existing admin AuthUser to the User if not already linked
                if (existingAuth.UserId != adminUser.Id)
                {
                    existingAuth.UserId = adminUser.Id;
                    _unitOfWork.AuthUsers.Update(existingAuth);
                }
                await AuthUserRoleHelper.EnsureUserHasAppRoleAsync(_unitOfWork, adminUser.Id, "ADMIN");
                return;
            }

            var authUser = new AuthUser
            {
                Email = "admin@gym.com",
                PasswordHash = PasswordHasher.Hash("admin123"),
                UserId = adminUser.Id
            };
            await _unitOfWork.AuthUsers.AddAsync(authUser);
            await AuthUserRoleHelper.EnsureUserHasAppRoleAsync(_unitOfWork, adminUser.Id, "ADMIN");
        }

        /// <summary>
        /// Ensures the user with username/email admin@gym.com has UserType "Admin" assigned (UserUserTypes).
        /// </summary>
        private async Task EnsureAdminUserHasAdminTypeAsync()
        {
            var adminAuth = await _unitOfWork.AuthUsers
                .FirstOrDefaultAsync(a => a.Email.ToLower() == "admin@gym.com");
            if (adminAuth?.UserId == null) return;

            var adminType = await _unitOfWork.UserTypes.FirstOrDefaultAsync(ut => ut.Name == "Admin");
            if (adminType == null) return;

            var alreadyAssigned = await _unitOfWork.UserUserTypes
                .FirstOrDefaultAsync(uut => uut.UserId == adminAuth.UserId.Value && uut.UserTypeId == adminType.Id);
            if (alreadyAssigned != null) return;

            await _unitOfWork.UserUserTypes.AddAsync(new UserUserType
            {
                UserId = adminAuth.UserId.Value,
                UserTypeId = adminType.Id,
                CreatedDate = DateTime.UtcNow
            });
        }

        /// <summary>
        /// Ensures Alex Johnson and Sam Williams (default instructors) have UserType "Trainer" assigned.
        /// </summary>
        private async Task EnsureInstructorUsersHaveTrainerTypeAsync()
        {
            var trainerType = await _unitOfWork.UserTypes.FirstOrDefaultAsync(ut => ut.Name == "Trainer");
            if (trainerType == null) return;

            var instructorUsers = await _unitOfWork.Users.FindAsync(u =>
                (u.FirstName == "Alex" && u.LastName == "Johnson") ||
                (u.FirstName == "Sam" && u.LastName == "Williams"));
            foreach (var user in instructorUsers)
            {
                var alreadyAssigned = await _unitOfWork.UserUserTypes
                    .FirstOrDefaultAsync(uut => uut.UserId == user.Id && uut.UserTypeId == trainerType.Id);
                if (alreadyAssigned != null) continue;

                await _unitOfWork.UserUserTypes.AddAsync(new UserUserType
                {
                    UserId = user.Id,
                    UserTypeId = trainerType.Id,
                    CreatedDate = DateTime.UtcNow
                });
                await AuthUserRoleHelper.EnsureUserHasAppRoleAsync(_unitOfWork, user.Id, "TRAINER");
            }
        }

        private async Task SeedPermissionsAsync()
        {
            var permissions = new[]
            {
                new { Code = "Reports", Name = "Reports", Description = "Access to reports" },
                new { Code = "CreateUsers", Name = "Can create users", Description = "Create and manage users" },
                new { Code = "Config", Name = "Config", Description = "System configuration access" },
                new { Code = "Payments", Name = "Create payments and see payment data", Description = "Create payments and view payment-related data" },
                new { Code = PermissionCodes.VoidPayment, Name = "Void payments", Description = "Void membership payment transactions" },
                new { Code = PermissionCodes.RefundPayment, Name = "Refund payments", Description = "Refund membership payment transactions" },
                new { Code = PermissionCodes.ApproveWaiveOff, Name = "Approve waive-off", Description = "Approve or reject fee waive-off requests" },
                new { Code = PermissionCodes.ViewFinancialAudit, Name = "Financial audit logs", Description = "View immutable financial audit trail" },
                new { Code = "TrainerAccess", Name = "Trainer access", Description = "Access to trainer/instructor features" },
                new { Code = "UsersAccess", Name = "Users access", Description = "Access to users and member data" },
                new { Code = "CREATE_MEMBER", Name = "Create member", Description = "Create new member / user accounts" },
                new { Code = "VIEW_ATTENDANCE", Name = "View attendance", Description = "View attendance logs and statistics" },
                new { Code = "MANAGE_ATTENDANCE", Name = "Manage attendance", Description = "Check-in, check-out, and edit attendance" },
                new { Code = "MANAGE_MEMBERS", Name = "Manage members", Description = "Update or delete users and profile details" },
                new { Code = PermissionCodes.LeadsCrm, Name = "Leads CRM", Description = "Lead pipeline, reception dashboard, conversion" },
                new { Code = PermissionCodes.LeadsTrainer, Name = "Leads (trainer)", Description = "View assigned lead trials and update trial feedback" },
                new { Code = PermissionCodes.RetailPos, Name = "Retail POS", Description = "Retail products, categories, inventory, and POS checkout" },
                new { Code = PermissionCodes.ManagePtPackages, Name = "Manage PT packages", Description = "Create and manage personal training packages and assignments" },
                new { Code = PermissionCodes.BookPtSessions, Name = "Book PT sessions", Description = "Book, reschedule, and cancel personal training sessions" },
                new { Code = PermissionCodes.ManagePtSchedules, Name = "Manage PT schedules", Description = "Manage trainer availability, schedules, and leave" },
                new { Code = PermissionCodes.ViewTrainerEarnings, Name = "View trainer earnings", Description = "View trainer PT earnings and commission data" },
                new { Code = PermissionCodes.ViewPtReports, Name = "View PT reports", Description = "Access personal training reports and exports" },
            };
            foreach (var p in permissions)
            {
                var existing = await _unitOfWork.Permissions.FirstOrDefaultAsync(perm => perm.Code == p.Code);
                if (existing == null)
                {
                    await _unitOfWork.Permissions.AddAsync(new Permission
                    {
                        Code = p.Code,
                        Name = p.Name,
                        Description = p.Description
                    });
                }
            }
        }

        /// <summary>Assigns lead CRM permissions to STAFF/TRAINER roles for reception and trial workflows (idempotent).</summary>
        private async Task EnsureDefaultRoleLeadPermissionsAsync()
        {
            async Task LinkAsync(string roleName, string permissionCode)
            {
                var role = await _unitOfWork.AppRoles.FirstOrDefaultAsync(r => r.Name == roleName);
                var perm = await _unitOfWork.Permissions.FirstOrDefaultAsync(p => p.Code == permissionCode);
                if (role == null || perm == null)
                    return;
                var exists = await _unitOfWork.RolePermissions.ExistsAsync(rp =>
                    rp.RoleId == role.Id && rp.PermissionId == perm.Id);
                if (exists)
                    return;
                await _unitOfWork.RolePermissions.AddAsync(new RolePermission
                {
                    RoleId = role.Id,
                    PermissionId = perm.Id,
                    CreatedDate = DateTime.UtcNow,
                });
            }

            await LinkAsync("STAFF", PermissionCodes.LeadsCrm);
            await LinkAsync("STAFF", PermissionCodes.CREATE_MEMBER);
            await LinkAsync("STAFF", PermissionCodes.UsersAccess);
            await LinkAsync("STAFF", PermissionCodes.VIEW_ATTENDANCE);
            await LinkAsync("TRAINER", PermissionCodes.LeadsTrainer);
            await LinkAsync("ADMIN", PermissionCodes.RetailPos);
            await LinkAsync("STAFF", PermissionCodes.RetailPos);
            await LinkAsync("ADMIN", PermissionCodes.ManagePtPackages);
            await LinkAsync("ADMIN", PermissionCodes.BookPtSessions);
            await LinkAsync("ADMIN", PermissionCodes.ManagePtSchedules);
            await LinkAsync("ADMIN", PermissionCodes.ViewTrainerEarnings);
            await LinkAsync("ADMIN", PermissionCodes.ViewPtReports);
            await LinkAsync("STAFF", PermissionCodes.ManagePtPackages);
            await LinkAsync("STAFF", PermissionCodes.BookPtSessions);
            await LinkAsync("STAFF", PermissionCodes.ManagePtSchedules);
            await LinkAsync("STAFF", PermissionCodes.ViewPtReports);
            await LinkAsync("STAFF", PermissionCodes.Payments);
            await LinkAsync("STAFF", PermissionCodes.VoidPayment);
            await LinkAsync("ADMIN", PermissionCodes.VoidPayment);
            await LinkAsync("ADMIN", PermissionCodes.RefundPayment);
            await LinkAsync("ADMIN", PermissionCodes.ApproveWaiveOff);
            await LinkAsync("ADMIN", PermissionCodes.ViewFinancialAudit);
            await LinkAsync("TRAINER", PermissionCodes.BookPtSessions);
            await LinkAsync("TRAINER", PermissionCodes.ManagePtSchedules);
            await LinkAsync("TRAINER", PermissionCodes.ViewTrainerEarnings);
        }

        /// <summary>Links every seeded <see cref="Permission"/> to the ADMIN <see cref="AppRole"/> (idempotent).</summary>
        private async Task EnsureAdminRoleHasAllPermissionsAsync()
        {
            var adminRole = await _unitOfWork.AppRoles.FirstOrDefaultAsync(r => r.Name == "ADMIN");
            if (adminRole == null) return;

            var permissions = await _unitOfWork.Permissions.GetAllAsync();
            foreach (var p in permissions)
            {
                var exists = await _unitOfWork.RolePermissions.ExistsAsync(rp =>
                    rp.RoleId == adminRole.Id && rp.PermissionId == p.Id);
                if (exists) continue;

                await _unitOfWork.RolePermissions.AddAsync(new RolePermission
                {
                    RoleId = adminRole.Id,
                    PermissionId = p.Id,
                    CreatedDate = DateTime.UtcNow
                });
            }
        }

        private async Task<Dictionary<string, BodyPart>> SeedBodyPartsAsync()
        {
            var bodyPartsDict = new Dictionary<string, BodyPart>();
            var bodyPartsData = new[]
            {
                new { Name = "Chest", Description = "Pectoral muscles" },
                new { Name = "Back", Description = "Latissimus dorsi, rhomboids, and trapezius" },
                new { Name = "Shoulders", Description = "Deltoid muscles" },
                new { Name = "Biceps", Description = "Biceps brachii" },
                new { Name = "Triceps", Description = "Triceps brachii" },
                new { Name = "Legs", Description = "Quadriceps, hamstrings, glutes, and calves" },
                new { Name = "Abs", Description = "Abdominal muscles" },
                new { Name = "Cardio", Description = "Cardiovascular exercises" }
            };

            foreach (var data in bodyPartsData)
            {
                // Ignore query filter so we see soft-deleted rows too (unique index may include them)
                var existing = await _context.Set<BodyPart>()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(bp => bp.Name == data.Name);

                if (existing == null)
                {
                    var bodyPart = new BodyPart
                    {
                        Name = data.Name,
                        Description = data.Description,
                        CreatedDate = DateTime.UtcNow
                    };
                    await _unitOfWork.BodyParts.AddAsync(bodyPart);
                }
                else if (existing.IsDeleted)
                {
                    // Restore soft-deleted body part so it can be used
                    existing.IsDeleted = false;
                    existing.UpdatedDate = DateTime.UtcNow;
                    existing.Description = data.Description;
                    _unitOfWork.BodyParts.Update(existing);
                }
            }

            await _unitOfWork.SaveChangesAsync();
            
            // Refresh to get all body parts with IDs
            var allBodyParts = await _unitOfWork.BodyParts.GetAllAsync();
            foreach (var bodyPart in allBodyParts)
            {
                bodyPartsDict[bodyPart.Name] = bodyPart;
            }

            return bodyPartsDict;
        }

        private async Task SeedBodyPartMusclesAsync(Dictionary<string, BodyPart> bodyParts)
        {
            var musclesByBodyPart = new Dictionary<string, List<(string Name, string? Description)>>
            {
                ["Chest"] = new()
                {
                    ("Upper Chest", "Clavicular head of pectoralis major. Targeted by incline bench press, incline dumbbell flyes, and cable crossovers set high."),
                    ("Lower Chest", "Sternal head of pectoralis major. Targeted by decline bench press, decline flyes, and dips."),
                    ("Inner Chest", "Inner fibres of the pectoralis major. Targeted by cable flyes, pec deck, and squeeze movements with hands close together."),
                    ("Outer Chest", "Outer fibres of the pectoralis major. Targeted by wide-grip bench press and wide-grip flyes."),
                },
                ["Back"] = new()
                {
                    ("Lats", "Latissimus dorsi. Primary muscle for back width and pulling strength. Targeted by pull-ups, lat pulldowns, and rows."),
                    ("Rhomboids", "Rhomboid major and minor, between the shoulder blades. Responsible for scapular retraction. Targeted by rows and reverse flyes."),
                    ("Trapezius", "Upper, middle, and lower trapezius. Supports shoulder movement and posture. Targeted by shrugs, rows, and face pulls."),
                    ("Lower Back", "Erector spinae. Supports the spine and hip hinge. Targeted by deadlifts, back extensions, and good mornings."),
                    ("Teres Major", "Assists the lats in pulling movements. Targeted by rows and pull-downs with elbows close to the body."),
                },
                ["Shoulders"] = new()
                {
                    ("Anterior Deltoid", "Front head of the deltoid. Involved in pressing and pushing. Targeted by overhead press, front raises, and bench press."),
                    ("Lateral Deltoid", "Side head of the deltoid. Responsible for shoulder width. Targeted by lateral raises and upright rows."),
                    ("Posterior Deltoid", "Rear head of the deltoid. Targeted by reverse flyes, face pulls, and bent-over lateral raises."),
                },
                ["Biceps"] = new()
                {
                    ("Short Head", "Short head of biceps brachii (inner bicep). Contributes to peak and curl strength. Emphasized with narrow-grip curls."),
                    ("Long Head", "Long head of biceps brachii (outer bicep). Contributes to arm width and length. Emphasized with wide-grip and incline curls."),
                },
                ["Triceps"] = new()
                {
                    ("Long Head", "Long head of triceps brachii, at the back of the arm. Targeted by overhead tricep extensions and close-grip bench."),
                    ("Lateral Head", "Lateral head of triceps. Targeted by tricep pushdowns, dips, and pressing movements."),
                    ("Medial Head", "Medial head of triceps, deep head. Contributes to overall tricep size and lockout strength."),
                },
                ["Legs"] = new()
                {
                    ("Quadriceps", "Quadriceps femoris (front of thigh). Four muscles: rectus femoris, vastus lateralis, vastus medialis, vastus intermedius. Targeted by squats, leg press, and leg extension."),
                    ("Hamstrings", "Back of the thigh: biceps femoris, semitendinosus, semimembranosus. Targeted by leg curls, Romanian deadlifts, and good mornings."),
                    ("Glutes", "Gluteus maximus, medius, and minimus. Hip extensors and abductors. Targeted by squats, hip thrusts, and glute bridges."),
                    ("Calves", "Gastrocnemius and soleus. Targeted by standing and seated calf raises."),
                },
                ["Abs"] = new()
                {
                    ("Upper Abs", "Upper portion of rectus abdominis. Targeted by crunches and decline sit-ups."),
                    ("Lower Abs", "Lower portion of rectus abdominis. Targeted by leg raises, reverse crunches, and hanging knee raises."),
                    ("Obliques", "Internal and external obliques (side abs). Targeted by twists, side bends, and wood chops."),
                },
                ["Cardio"] = new() { }, // No muscle subgroups for cardio
            };

            foreach (var (bodyPartName, muscles) in musclesByBodyPart)
            {
                if (!bodyParts.TryGetValue(bodyPartName, out var bodyPart) || muscles.Count == 0)
                    continue;

                foreach (var (name, description) in muscles)
                {
                    var exists = await _unitOfWork.BodyPartMuscles
                        .ExistsAsync(m => m.BodyPartId == bodyPart.Id && m.Name == name);
                    if (exists)
                        continue;

                    var muscle = new BodyPartMuscle
                    {
                        BodyPartId = bodyPart.Id,
                        Name = name,
                        Description = description,
                        CreatedDate = DateTime.UtcNow
                    };
                    await _unitOfWork.BodyPartMuscles.AddAsync(muscle);
                }
            }
        }

        private async Task<int> SeedExercisesAsync(Dictionary<string, BodyPart> bodyParts)
        {
            var now = DateTime.UtcNow;
            var exercises = new List<Exercise>();
            var insertedCount = 0;

            void AddExercise(string bodyPartName, string name, string description, string steps, string difficulty, string equipment)
            {
                if (!bodyParts.TryGetValue(bodyPartName, out var bodyPart))
                    return;

                exercises.Add(new Exercise
                {
                    Name = name,
                    Description = description,
                    Steps = steps,
                    DifficultyLevel = difficulty,
                    EquipmentRequired = equipment,
                    BodyPartId = bodyPart.Id,
                    CreatedDate = now
                });
            }

            // Chest (7)
            AddExercise("Chest", "Push-ups", "Basic bodyweight chest exercise", "1. Start in plank position\n2. Lower chest with control\n3. Push back up\n4. Repeat", "Beginner", "None");
            AddExercise("Chest", "Bench Press", "Classic chest strength exercise", "1. Lie flat on bench\n2. Lower bar to chest\n3. Press to lockout\n4. Repeat", "Intermediate", "Barbell, Bench");
            AddExercise("Chest", "Incline Dumbbell Press", "Upper chest development", "1. Set incline bench\n2. Press dumbbells upward\n3. Control descent\n4. Repeat", "Intermediate", "Dumbbells, Incline Bench");
            AddExercise("Chest", "Decline Bench Press", "Lower chest emphasis", "1. Set decline bench\n2. Lower bar to chest\n3. Press upward\n4. Repeat", "Intermediate", "Barbell, Decline Bench");
            AddExercise("Chest", "Cable Fly", "Isolation for chest fibers", "1. Stand between pulleys\n2. Bring handles together\n3. Squeeze chest\n4. Return slowly", "Beginner", "Cable Machine");
            AddExercise("Chest", "Dumbbell Fly", "Chest stretch and contraction", "1. Lie on bench with slight elbow bend\n2. Open arms wide\n3. Bring back together\n4. Repeat", "Beginner", "Dumbbells, Bench");
            AddExercise("Chest", "Chest Dips", "Bodyweight chest and triceps movement", "1. Lean forward on dip bars\n2. Lower body\n3. Press up\n4. Repeat", "Advanced", "Dip Bars");

            // Back (7)
            AddExercise("Back", "Pull-ups", "Upper back and lat strength", "1. Hang from bar\n2. Pull chin above bar\n3. Lower with control\n4. Repeat", "Intermediate", "Pull-up Bar");
            AddExercise("Back", "Bent-Over Row", "Back thickness development", "1. Hinge at hips\n2. Row bar to torso\n3. Squeeze shoulder blades\n4. Lower", "Intermediate", "Barbell");
            AddExercise("Back", "Lat Pulldown", "Lat-focused pulling exercise", "1. Sit at machine\n2. Pull bar to upper chest\n3. Squeeze lats\n4. Return", "Beginner", "Lat Pulldown Machine");
            AddExercise("Back", "Seated Cable Row", "Mid-back and rhomboid emphasis", "1. Sit with neutral spine\n2. Pull handle to torso\n3. Pause and squeeze\n4. Return", "Beginner", "Cable Row Machine");
            AddExercise("Back", "Deadlift", "Posterior chain strength builder", "1. Set stance and grip\n2. Drive through floor\n3. Stand tall\n4. Lower safely", "Advanced", "Barbell, Plates");
            AddExercise("Back", "Single Arm Dumbbell Row", "Unilateral back development", "1. Support body on bench\n2. Pull dumbbell to hip\n3. Squeeze lat\n4. Lower", "Beginner", "Dumbbell, Bench");
            AddExercise("Back", "Face Pull", "Rear shoulder and upper back health", "1. Set rope at face height\n2. Pull rope to forehead\n3. Rotate thumbs back\n4. Return", "Beginner", "Cable Machine, Rope");

            // Shoulders (6)
            AddExercise("Shoulders", "Overhead Press", "Shoulder strength and stability", "1. Brace core\n2. Press weight overhead\n3. Lock elbows softly\n4. Lower", "Intermediate", "Barbell or Dumbbells");
            AddExercise("Shoulders", "Lateral Raises", "Side deltoid isolation", "1. Raise dumbbells to shoulder height\n2. Keep slight elbow bend\n3. Lower slowly\n4. Repeat", "Beginner", "Dumbbells");
            AddExercise("Shoulders", "Front Raises", "Anterior deltoid isolation", "1. Raise weight in front\n2. Stop at shoulder level\n3. Lower with control\n4. Repeat", "Beginner", "Dumbbells or Plate");
            AddExercise("Shoulders", "Rear Delt Fly", "Posterior deltoid focus", "1. Hinge hips\n2. Open arms laterally\n3. Squeeze rear delts\n4. Lower", "Beginner", "Dumbbells");
            AddExercise("Shoulders", "Arnold Press", "Full shoulder pressing range", "1. Start palms facing you\n2. Rotate and press overhead\n3. Reverse motion\n4. Repeat", "Intermediate", "Dumbbells");
            AddExercise("Shoulders", "Upright Row", "Trap and shoulder engagement", "1. Hold bar close grip\n2. Pull to chest height\n3. Keep elbows high\n4. Lower", "Intermediate", "Barbell or EZ Bar");

            // Biceps (5)
            AddExercise("Biceps", "Bicep Curls", "Basic biceps growth movement", "1. Curl weights up\n2. Keep elbows fixed\n3. Squeeze at top\n4. Lower slowly", "Beginner", "Dumbbells");
            AddExercise("Biceps", "Hammer Curls", "Biceps and brachialis focus", "1. Use neutral grip\n2. Curl upward\n3. Pause briefly\n4. Lower", "Beginner", "Dumbbells");
            AddExercise("Biceps", "Preacher Curl", "Strict biceps isolation", "1. Set upper arms on pad\n2. Curl bar up\n3. Squeeze biceps\n4. Lower fully", "Intermediate", "Preacher Bench, EZ Bar");
            AddExercise("Biceps", "Concentration Curl", "Single-arm peak contraction", "1. Brace elbow on thigh\n2. Curl dumbbell up\n3. Squeeze top\n4. Lower", "Beginner", "Dumbbell");
            AddExercise("Biceps", "Cable Curl", "Constant tension biceps exercise", "1. Stand at cable station\n2. Curl handle upward\n3. Control descent\n4. Repeat", "Beginner", "Cable Machine");

            // Triceps (5)
            AddExercise("Triceps", "Tricep Dips", "Bodyweight triceps movement", "1. Set hands on bench\n2. Lower body by elbow bend\n3. Press up\n4. Repeat", "Beginner", "Bench");
            AddExercise("Triceps", "Overhead Tricep Extension", "Long head triceps emphasis", "1. Hold weight overhead\n2. Lower behind head\n3. Extend elbows\n4. Repeat", "Beginner", "Dumbbell");
            AddExercise("Triceps", "Tricep Pushdown", "Cable triceps isolation", "1. Keep elbows tucked\n2. Push bar down\n3. Fully extend arms\n4. Return", "Beginner", "Cable Machine");
            AddExercise("Triceps", "Close Grip Bench Press", "Pressing movement for triceps", "1. Grip bar narrow\n2. Lower to chest\n3. Press up\n4. Repeat", "Intermediate", "Barbell, Bench");
            AddExercise("Triceps", "Skull Crushers", "Elbow extension strength", "1. Lie on bench\n2. Lower bar toward forehead\n3. Extend elbows\n4. Repeat", "Intermediate", "EZ Bar, Bench");

            // Legs (10)
            AddExercise("Legs", "Squats", "Foundational leg strength movement", "1. Brace core\n2. Sit hips back and down\n3. Drive through feet\n4. Stand", "Beginner", "Bodyweight or Barbell");
            AddExercise("Legs", "Lunges", "Unilateral legs and glutes", "1. Step forward\n2. Lower rear knee\n3. Push to start\n4. Alternate", "Beginner", "Bodyweight or Dumbbells");
            AddExercise("Legs", "Leg Press", "Machine-based quad/glute load", "1. Set feet on platform\n2. Lower by knee bend\n3. Press out\n4. Repeat", "Beginner", "Leg Press Machine");
            AddExercise("Legs", "Romanian Deadlift", "Hamstring and glute hinge", "1. Hinge from hips\n2. Lower bar to mid-shin\n3. Keep back neutral\n4. Stand", "Intermediate", "Barbell or Dumbbells");
            AddExercise("Legs", "Leg Extension", "Quadriceps isolation", "1. Sit in machine\n2. Extend knees\n3. Squeeze quads\n4. Lower", "Beginner", "Leg Extension Machine");
            AddExercise("Legs", "Leg Curl", "Hamstring isolation", "1. Set machine position\n2. Curl heels toward glutes\n3. Pause\n4. Lower", "Beginner", "Leg Curl Machine");
            AddExercise("Legs", "Calf Raises", "Calf hypertrophy movement", "1. Raise heels up\n2. Pause at top\n3. Lower below neutral\n4. Repeat", "Beginner", "Calf Raise Machine");
            AddExercise("Legs", "Bulgarian Split Squat", "Single-leg strength and balance", "1. Rear foot elevated\n2. Lower under control\n3. Drive up\n4. Repeat", "Intermediate", "Bench, Dumbbells");
            AddExercise("Legs", "Hip Thrust", "Glute-dominant strength lift", "1. Upper back on bench\n2. Drive hips upward\n3. Squeeze glutes\n4. Lower", "Intermediate", "Barbell, Bench");
            AddExercise("Legs", "Goblet Squat", "Beginner-friendly squat pattern", "1. Hold dumbbell at chest\n2. Squat down\n3. Keep chest tall\n4. Stand", "Beginner", "Dumbbell or Kettlebell");

            // Abs (5)
            AddExercise("Abs", "Crunches", "Upper ab exercise", "1. Lie on back\n2. Curl shoulders up\n3. Exhale and squeeze\n4. Lower", "Beginner", "None");
            AddExercise("Abs", "Plank", "Core isometric strength", "1. Set forearm plank\n2. Keep body straight\n3. Brace core\n4. Hold", "Beginner", "None");
            AddExercise("Abs", "Leg Raises", "Lower abs exercise", "1. Lie flat\n2. Raise legs up\n3. Lower with control\n4. Repeat", "Beginner", "None");
            AddExercise("Abs", "Russian Twist", "Oblique rotation exercise", "1. Sit with torso leaned back\n2. Rotate side to side\n3. Keep core tight\n4. Repeat", "Intermediate", "Bodyweight or Plate");
            AddExercise("Abs", "Bicycle Crunch", "Dynamic oblique and rectus work", "1. Alternate elbow-to-knee\n2. Extend opposite leg\n3. Keep tempo steady\n4. Repeat", "Intermediate", "None");

            // Cardio (5)
            AddExercise("Cardio", "Jumping Jacks", "Simple full-body cardio warmup", "1. Jump feet out and arms up\n2. Return to start\n3. Maintain rhythm\n4. Repeat", "Beginner", "None");
            AddExercise("Cardio", "Burpees", "High-intensity full-body cardio", "1. Squat down\n2. Kick to plank\n3. Push-up optional\n4. Jump up", "Intermediate", "None");
            AddExercise("Cardio", "Mountain Climbers", "Core + cardio drill", "1. Start in plank\n2. Drive knees alternately\n3. Keep hips level\n4. Continue", "Intermediate", "None");
            AddExercise("Cardio", "High Knees", "Cardio conditioning movement", "1. Run in place\n2. Lift knees to hip height\n3. Pump arms\n4. Maintain pace", "Beginner", "None");
            AddExercise("Cardio", "Jump Rope", "Coordination and endurance cardio", "1. Hold rope handles\n2. Jump minimally each turn\n3. Keep elbows close\n4. Continue", "Beginner", "Jump Rope");

            foreach (var exercise in exercises)
            {
                var exists = await _unitOfWork.Exercises.ExistsAsync(e => e.Name == exercise.Name && e.BodyPartId == exercise.BodyPartId);
                if (!exists)
                {
                    await _unitOfWork.Exercises.AddAsync(exercise);
                    insertedCount++;
                }
            }
            return insertedCount;
        }

        private async Task SeedDietPlansAsync()
        {
            if (await _unitOfWork.DietPlans.ExistsAsync(p => p.PlanName == "High Protein Muscle Gain"))
                return;

            // Plan 1: High Protein Muscle Gain (2500 cal)
            var plan1 = new DietPlan
            {
                PlanName = "High Protein Muscle Gain",
                GoalType = "MuscleGain",
                Calories = 2500,
                ProteinGrams = 180,
                CarbsGrams = 250,
                FatsGrams = 85,
                Description = "Optimal for building muscle with high protein, balanced carbs and healthy fats. Best combined with resistance training.",
                IsActive = true,
            };
            await _unitOfWork.DietPlans.AddAsync(plan1);
            await _unitOfWork.SaveChangesAsync();

            var plan1Meals = new List<DietMeal>
            {
                new DietMeal { DietPlanId = plan1.Id, MealName = "Breakfast", MealOrder = 1 },
                new DietMeal { DietPlanId = plan1.Id, MealName = "Mid-Morning Snack", MealOrder = 2 },
                new DietMeal { DietPlanId = plan1.Id, MealName = "Lunch", MealOrder = 3 },
                new DietMeal { DietPlanId = plan1.Id, MealName = "Pre-Workout Snack", MealOrder = 4 },
                new DietMeal { DietPlanId = plan1.Id, MealName = "Dinner", MealOrder = 5 },
            };
            await _context.DietMeals.AddRangeAsync(plan1Meals);
            await _context.SaveChangesAsync();

            var plan1Items = new List<DietMealItem>
            {
                new DietMealItem { DietMealId = plan1Meals[0].Id, FoodName = "Oatmeal with banana", Quantity = "1 cup cooked + 1 medium banana", Calories = 280, ProteinGrams = 8, CarbsGrams = 52, FatsGrams = 5 },
                new DietMealItem { DietMealId = plan1Meals[0].Id, FoodName = "Whole eggs", Quantity = "3 large, scrambled", Calories = 234, ProteinGrams = 18, CarbsGrams = 2, FatsGrams = 18 },
                new DietMealItem { DietMealId = plan1Meals[0].Id, FoodName = "Greek yogurt", Quantity = "150g", Calories = 130, ProteinGrams = 15, CarbsGrams = 7, FatsGrams = 5 },
                new DietMealItem { DietMealId = plan1Meals[1].Id, FoodName = "Protein shake", Quantity = "1 scoop with water", Calories = 120, ProteinGrams = 24, CarbsGrams = 3, FatsGrams = 1 },
                new DietMealItem { DietMealId = plan1Meals[1].Id, FoodName = "Almonds", Quantity = "30g (handful)", Calories = 174, ProteinGrams = 6, CarbsGrams = 6, FatsGrams = 15 },
                new DietMealItem { DietMealId = plan1Meals[2].Id, FoodName = "Chicken breast", Quantity = "180g grilled", Calories = 297, ProteinGrams = 55, CarbsGrams = 0, FatsGrams = 6 },
                new DietMealItem { DietMealId = plan1Meals[2].Id, FoodName = "Brown rice", Quantity = "1 cup cooked", Calories = 216, ProteinGrams = 5, CarbsGrams = 45, FatsGrams = 2 },
                new DietMealItem { DietMealId = plan1Meals[2].Id, FoodName = "Broccoli", Quantity = "1 cup steamed", Calories = 55, ProteinGrams = 4, CarbsGrams = 11, FatsGrams = 0 },
                new DietMealItem { DietMealId = plan1Meals[3].Id, FoodName = "Banana", Quantity = "1 medium", Calories = 105, ProteinGrams = 1, CarbsGrams = 27, FatsGrams = 0 },
                new DietMealItem { DietMealId = plan1Meals[3].Id, FoodName = "Peanut butter", Quantity = "2 tbsp", Calories = 188, ProteinGrams = 8, CarbsGrams = 7, FatsGrams = 16 },
                new DietMealItem { DietMealId = plan1Meals[4].Id, FoodName = "Salmon fillet", Quantity = "200g baked", Calories = 412, ProteinGrams = 44, CarbsGrams = 0, FatsGrams = 25 },
                new DietMealItem { DietMealId = plan1Meals[4].Id, FoodName = "Sweet potato", Quantity = "1 medium", Calories = 103, ProteinGrams = 2, CarbsGrams = 24, FatsGrams = 0 },
                new DietMealItem { DietMealId = plan1Meals[4].Id, FoodName = "Green beans", Quantity = "1 cup", Calories = 44, ProteinGrams = 2, CarbsGrams = 10, FatsGrams = 0 },
            };
            await _context.DietMealItems.AddRangeAsync(plan1Items);
            await _context.SaveChangesAsync();

            // Plan 2: Lean Fat Loss (1800 cal)
            var plan2 = new DietPlan
            {
                PlanName = "Lean Fat Loss",
                GoalType = "FatLoss",
                Calories = 1800,
                ProteinGrams = 140,
                CarbsGrams = 150,
                FatsGrams = 60,
                Description = "Calorie deficit with high protein to preserve muscle. Ideal for sustainable weight loss with adequate nutrients.",
                IsActive = true,
            };
            await _unitOfWork.DietPlans.AddAsync(plan2);
            await _unitOfWork.SaveChangesAsync();

            var plan2Meals = new List<DietMeal>
            {
                new DietMeal { DietPlanId = plan2.Id, MealName = "Breakfast", MealOrder = 1 },
                new DietMeal { DietPlanId = plan2.Id, MealName = "Lunch", MealOrder = 2 },
                new DietMeal { DietPlanId = plan2.Id, MealName = "Afternoon Snack", MealOrder = 3 },
                new DietMeal { DietPlanId = plan2.Id, MealName = "Dinner", MealOrder = 4 },
            };
            await _context.DietMeals.AddRangeAsync(plan2Meals);
            await _context.SaveChangesAsync();

            var plan2Items = new List<DietMealItem>
            {
                new DietMealItem { DietMealId = plan2Meals[0].Id, FoodName = "Eggs", Quantity = "2 whole, boiled or poached", Calories = 156, ProteinGrams = 12, CarbsGrams = 1, FatsGrams = 11 },
                new DietMealItem { DietMealId = plan2Meals[0].Id, FoodName = "Spinach", Quantity = "1 cup sautéed", Calories = 41, ProteinGrams = 5, CarbsGrams = 4, FatsGrams = 1 },
                new DietMealItem { DietMealId = plan2Meals[0].Id, FoodName = "Whole grain toast", Quantity = "1 slice", Calories = 81, ProteinGrams = 4, CarbsGrams = 14, FatsGrams = 1 },
                new DietMealItem { DietMealId = plan2Meals[1].Id, FoodName = "Turkey breast", Quantity = "150g", Calories = 168, ProteinGrams = 35, CarbsGrams = 0, FatsGrams = 2 },
                new DietMealItem { DietMealId = plan2Meals[1].Id, FoodName = "Mixed salad", Quantity = "2 cups with lemon dressing", Calories = 60, ProteinGrams = 3, CarbsGrams = 8, FatsGrams = 2 },
                new DietMealItem { DietMealId = plan2Meals[1].Id, FoodName = "Quinoa", Quantity = "1/2 cup cooked", Calories = 111, ProteinGrams = 4, CarbsGrams = 20, FatsGrams = 2 },
                new DietMealItem { DietMealId = plan2Meals[2].Id, FoodName = "Apple", Quantity = "1 medium", Calories = 95, ProteinGrams = 0, CarbsGrams = 25, FatsGrams = 0 },
                new DietMealItem { DietMealId = plan2Meals[2].Id, FoodName = "Almonds", Quantity = "15g", Calories = 87, ProteinGrams = 3, CarbsGrams = 3, FatsGrams = 7 },
                new DietMealItem { DietMealId = plan2Meals[3].Id, FoodName = "Grilled chicken", Quantity = "150g", Calories = 248, ProteinGrams = 46, CarbsGrams = 0, FatsGrams = 5 },
                new DietMealItem { DietMealId = plan2Meals[3].Id, FoodName = "Steamed vegetables", Quantity = "1.5 cups (broccoli, carrots)", Calories = 75, ProteinGrams = 4, CarbsGrams = 14, FatsGrams = 0 },
                new DietMealItem { DietMealId = plan2Meals[3].Id, FoodName = "Brown rice", Quantity = "1/2 cup cooked", Calories = 108, ProteinGrams = 3, CarbsGrams = 22, FatsGrams = 1 },
            };
            await _context.DietMealItems.AddRangeAsync(plan2Items);
            await _context.SaveChangesAsync();

            // Plan 3: Balanced Maintenance (2000 cal)
            var plan3 = new DietPlan
            {
                PlanName = "Balanced Maintenance",
                GoalType = "Maintenance",
                Calories = 2000,
                ProteinGrams = 120,
                CarbsGrams = 220,
                FatsGrams = 70,
                Description = "Balanced macros for maintaining weight and general fitness. Suitable for active adults with no specific gain or loss goal.",
                IsActive = true,
            };
            await _unitOfWork.DietPlans.AddAsync(plan3);
            await _unitOfWork.SaveChangesAsync();

            var plan3Meals = new List<DietMeal>
            {
                new DietMeal { DietPlanId = plan3.Id, MealName = "Breakfast", MealOrder = 1 },
                new DietMeal { DietPlanId = plan3.Id, MealName = "Lunch", MealOrder = 2 },
                new DietMeal { DietPlanId = plan3.Id, MealName = "Snack", MealOrder = 3 },
                new DietMeal { DietPlanId = plan3.Id, MealName = "Dinner", MealOrder = 4 },
            };
            await _context.DietMeals.AddRangeAsync(plan3Meals);
            await _context.SaveChangesAsync();

            var plan3Items = new List<DietMealItem>
            {
                new DietMealItem { DietMealId = plan3Meals[0].Id, FoodName = "Oatmeal", Quantity = "1 cup cooked", Calories = 158, ProteinGrams = 6, CarbsGrams = 28, FatsGrams = 3 },
                new DietMealItem { DietMealId = plan3Meals[0].Id, FoodName = "Mixed berries", Quantity = "1/2 cup", Calories = 40, ProteinGrams = 1, CarbsGrams = 10, FatsGrams = 0 },
                new DietMealItem { DietMealId = plan3Meals[0].Id, FoodName = "Walnuts", Quantity = "30g", Calories = 196, ProteinGrams = 5, CarbsGrams = 4, FatsGrams = 20 },
                new DietMealItem { DietMealId = plan3Meals[1].Id, FoodName = "Lean beef or chicken", Quantity = "150g", Calories = 248, ProteinGrams = 35, CarbsGrams = 0, FatsGrams = 10 },
                new DietMealItem { DietMealId = plan3Meals[1].Id, FoodName = "Rice", Quantity = "3/4 cup cooked", Calories = 162, ProteinGrams = 3, CarbsGrams = 35, FatsGrams = 0 },
                new DietMealItem { DietMealId = plan3Meals[1].Id, FoodName = "Side salad", Quantity = "1 cup with olive oil", Calories = 120, ProteinGrams = 2, CarbsGrams = 6, FatsGrams = 10 },
                new DietMealItem { DietMealId = plan3Meals[2].Id, FoodName = "Hummus", Quantity = "3 tbsp", Calories = 120, ProteinGrams = 4, CarbsGrams = 10, FatsGrams = 8 },
                new DietMealItem { DietMealId = plan3Meals[2].Id, FoodName = "Carrot and cucumber sticks", Quantity = "1 cup", Calories = 35, ProteinGrams = 2, CarbsGrams = 8, FatsGrams = 0 },
                new DietMealItem { DietMealId = plan3Meals[3].Id, FoodName = "Baked fish (tilapia or cod)", Quantity = "180g", Calories = 220, ProteinGrams = 38, CarbsGrams = 0, FatsGrams = 5 },
                new DietMealItem { DietMealId = plan3Meals[3].Id, FoodName = "Roasted vegetables", Quantity = "1 cup", Calories = 82, ProteinGrams = 3, CarbsGrams = 12, FatsGrams = 3 },
                new DietMealItem { DietMealId = plan3Meals[3].Id, FoodName = "Brown rice", Quantity = "1/2 cup cooked", Calories = 108, ProteinGrams = 3, CarbsGrams = 22, FatsGrams = 1 },
            };
            await _context.DietMealItems.AddRangeAsync(plan3Items);
            await _context.SaveChangesAsync();
        }

        private async Task SeedWorkoutPlansAsync()
        {
            // Warmup Plan
            var warmupExists = await _unitOfWork.WorkoutPlans
                .ExistsAsync(wp => wp.Name == "Full Body Warmup");
            
            if (!warmupExists)
            {
                var warmupPlan = new WorkoutPlan
                {
                    Name = "Full Body Warmup",
                    Description = "Complete warmup routine to prepare your body for exercise",
                    WorkoutType = WorkoutType.Warmup,
                    Duration = 10,
                    DifficultyLevel = "Beginner",
                    IsActive = true,
                    CreatedDate = DateTime.UtcNow
                };
                await _unitOfWork.WorkoutPlans.AddAsync(warmupPlan);
            }

            // Short HIIT Plan
            var shortHIITExists = await _unitOfWork.WorkoutPlans
                .ExistsAsync(wp => wp.Name == "Short HIIT Workout");
            
            if (!shortHIITExists)
            {
                var shortHIIT = new WorkoutPlan
                {
                    Name = "Short HIIT Workout",
                    Description = "High intensity interval training - 15 minutes of intense cardio",
                    WorkoutType = WorkoutType.ShortHIIT,
                    Duration = 15,
                    DifficultyLevel = "Intermediate",
                    IsActive = true,
                    CreatedDate = DateTime.UtcNow
                };
                await _unitOfWork.WorkoutPlans.AddAsync(shortHIIT);
            }

            // Long HIIT Plan
            var longHIITExists = await _unitOfWork.WorkoutPlans
                .ExistsAsync(wp => wp.Name == "Long HIIT Workout");
            
            if (!longHIITExists)
            {
                var longHIIT = new WorkoutPlan
                {
                    Name = "Long HIIT Workout",
                    Description = "Extended high intensity interval training - 30 minutes of intense cardio",
                    WorkoutType = WorkoutType.LongHIIT,
                    Duration = 30,
                    DifficultyLevel = "Advanced",
                    IsActive = true,
                    CreatedDate = DateTime.UtcNow
                };
                await _unitOfWork.WorkoutPlans.AddAsync(longHIIT);
            }
        }

        private async Task<WorkoutPlanDay> AddPremiumDayAsync(int planId, int weekId, int dow, string title, string focus, bool rest, int order, int? durationMinutes = null)
        {
            var d = new WorkoutPlanDay
            {
                WorkoutPlanId = planId,
                WorkoutPlanWeekId = weekId,
                DayNumber = dow,
                Name = title,
                FocusArea = focus,
                IsRestDay = rest,
                OrderIndex = order,
                DurationMinutes = durationMinutes,
            };
            await _unitOfWork.WorkoutPlanDays.AddAsync(d);
            await _unitOfWork.SaveChangesAsync();
            return d;
        }

        private async Task AddPremiumExercisesAsync(int planId, int dayId, Func<string, Task<int?>> resolveExerciseId, params (string name, int sets, int reps, int rest, int order)[] rows)
        {
            foreach (var row in rows)
            {
                var eid = await resolveExerciseId(row.name);
                if (!eid.HasValue) continue;
                await _unitOfWork.WorkoutPlanExercises.AddAsync(new WorkoutPlanExercise
                {
                    WorkoutPlanId = planId,
                    WorkoutPlanDayId = dayId,
                    ExerciseId = eid.Value,
                    Sets = row.sets,
                    Reps = row.reps,
                    RestBetweenSets = row.rest,
                    Order = row.order,
                    Tempo = "3-0-1-0",
                    Intensity = "RPE 7",
                });
            }
            await _unitOfWork.SaveChangesAsync();
        }

        /// <summary>Industry-style programs with week/day structure (idempotent by plan name).</summary>
        private async Task SeedPremiumProgramsAsync()
        {
            var trainer = await _unitOfWork.Trainers.FirstOrDefaultAsync(_ => true);
            var trainerId = trainer?.Id;

            async Task<int?> ExerciseId(string name) =>
                (await _unitOfWork.Exercises.FirstOrDefaultAsync(e => e.Name == name))?.Id;

            async Task AddExerciseRow(int planId, int? dayId, int exerciseId, int sets, int reps, int restSec, int order, string? tempo = "3-0-1-0", string? intensity = "RPE 7")
            {
                await _unitOfWork.WorkoutPlanExercises.AddAsync(new WorkoutPlanExercise
                {
                    WorkoutPlanId = planId,
                    WorkoutPlanDayId = dayId,
                    ExerciseId = exerciseId,
                    Sets = sets,
                    Reps = reps,
                    RestBetweenSets = restSec,
                    Order = order,
                    Tempo = tempo,
                    Intensity = intensity
                });
            }

            // --- 1. Beginner Muscle Gain — 90 Days --------------------------------
            if (!await _unitOfWork.WorkoutPlans.ExistsAsync(p => p.Name == "Beginner Muscle Gain - 90 Days"))
            {
                var p = new WorkoutPlan
                {
                    Name = "Beginner Muscle Gain - 90 Days",
                    Description = "Progressive hypertrophy template with a classic 5-day split. Week 1 establishes movement quality; add load or reps weekly.",
                    Goal = "Muscle Gain",
                    WorkoutType = WorkoutType.Strength,
                    Duration = 55,
                    DurationDays = 90,
                    WorkoutsPerWeek = 5,
                    DifficultyLevel = "Beginner",
                    TrainerId = trainerId,
                    IsActive = true,
                    IsPublic = true,
                    Status = "Active",
                    Thumbnail = "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80",
                    EstimatedCaloriesBurn = 340,
                    Tags = "[\"Hypertrophy\",\"Foundation\",\"Progressive overload\"]",
                };
                await _unitOfWork.WorkoutPlans.AddAsync(p);
                await _unitOfWork.SaveChangesAsync();

                var w1 = new WorkoutPlanWeek { WorkoutPlanId = p.Id, WeekNumber = 1, Name = "Accumulation" };
                await _unitOfWork.WorkoutPlanWeeks.AddAsync(w1);
                await _unitOfWork.SaveChangesAsync();

                async Task<WorkoutPlanDay> AddDay(int dow, string title, string focus, bool rest, int ord, int? mins)
                {
                    var d = new WorkoutPlanDay
                    {
                        WorkoutPlanId = p.Id,
                        WorkoutPlanWeekId = w1.Id,
                        DayNumber = dow,
                        Name = title,
                        FocusArea = focus,
                        IsRestDay = rest,
                        OrderIndex = ord,
                        DurationMinutes = mins,
                    };
                    await _unitOfWork.WorkoutPlanDays.AddAsync(d);
                    await _unitOfWork.SaveChangesAsync();
                    return d;
                }

                var mon = await AddDay(1, "Monday — Chest + Triceps", "Chest, Triceps", false, 1, 55);
                foreach (var row in new (string ex, int s, int r, int rest, int o)[]
                {
                    ("Bench Press", 3, 10, 90, 1),
                    ("Incline Dumbbell Press", 3, 10, 90, 2),
                    ("Cable Fly", 3, 12, 60, 3),
                    ("Tricep Pushdown", 3, 12, 60, 4),
                    ("Overhead Tricep Extension", 3, 12, 60, 5),
                })
                {
                    var eid = await ExerciseId(row.ex);
                    if (eid.HasValue) await AddExerciseRow(p.Id, mon.Id, eid.Value, row.s, row.r, row.rest, row.o);
                }

                var tue = await AddDay(2, "Tuesday — Back + Biceps", "Back, Biceps", false, 2, 55);
                foreach (var row in new (string ex, int s, int r, int rest, int o)[]
                {
                    ("Lat Pulldown", 3, 10, 90, 1),
                    ("Seated Cable Row", 3, 10, 90, 2),
                    ("Single Arm Dumbbell Row", 3, 10, 75, 3),
                    ("Bicep Curls", 3, 12, 60, 4),
                    ("Hammer Curls", 3, 12, 60, 5),
                })
                {
                    var eid = await ExerciseId(row.ex);
                    if (eid.HasValue) await AddExerciseRow(p.Id, tue.Id, eid.Value, row.s, row.r, row.rest, row.o);
                }

                var wed = await AddDay(3, "Wednesday — Legs", "Quads, Hamstrings, Glutes", false, 3, 60);
                foreach (var row in new (string ex, int s, int r, int rest, int o)[]
                {
                    ("Squats", 4, 8, 120, 1),
                    ("Romanian Deadlift", 3, 10, 120, 2),
                    ("Leg Press", 3, 12, 90, 3),
                    ("Leg Curl", 3, 12, 60, 4),
                    ("Calf Raises", 3, 15, 45, 5),
                })
                {
                    var eid = await ExerciseId(row.ex);
                    if (eid.HasValue) await AddExerciseRow(p.Id, wed.Id, eid.Value, row.s, row.r, row.rest, row.o);
                }

                var thu = await AddDay(4, "Thursday — Shoulders + Abs", "Delts, Core", false, 4, 50);
                foreach (var row in new (string ex, int s, int r, int rest, int o)[]
                {
                    ("Overhead Press", 4, 8, 120, 1),
                    ("Lateral Raises", 3, 12, 60, 2),
                    ("Rear Delt Fly", 3, 12, 60, 3),
                    ("Plank", 3, 45, 45, 4),
                    ("Leg Raises", 3, 12, 45, 5),
                })
                {
                    var eid = await ExerciseId(row.ex);
                    if (eid.HasValue) await AddExerciseRow(p.Id, thu.Id, eid.Value, row.s, row.r, row.rest, row.o);
                }

                var fri = await AddDay(5, "Friday — Full Body", "Compound + conditioning", false, 5, 50);
                foreach (var row in new (string ex, int s, int r, int rest, int o)[]
                {
                    ("Goblet Squat", 3, 12, 90, 1),
                    ("Push-ups", 3, 15, 60, 2),
                    ("Lat Pulldown", 3, 10, 75, 3),
                    ("Lunges", 3, 12, 60, 4),
                    ("Mountain Climbers", 3, 20, 45, 5),
                })
                {
                    var eid = await ExerciseId(row.ex);
                    if (eid.HasValue) await AddExerciseRow(p.Id, fri.Id, eid.Value, row.s, row.r, row.rest, row.o);
                }

                await AddDay(6, "Saturday — Rest", "Recovery", true, 6, null);
                await AddDay(7, "Sunday — Rest", "Recovery", true, 7, null);
                await _unitOfWork.SaveChangesAsync();
            }

            // --- 2. Fat Loss HIIT — 60 Days -----------------------------------------
            if (!await _unitOfWork.WorkoutPlans.ExistsAsync(p => p.Name == "Fat Loss HIIT - 60 Days"))
            {
                var p = new WorkoutPlan
                {
                    Name = "Fat Loss HIIT - 60 Days",
                    Description = "Metabolic conditioning with strength maintenance. Alternates full-body circuits and lower-impact active recovery.",
                    Goal = "Fat Loss",
                    WorkoutType = WorkoutType.ShortHIIT,
                    Duration = 40,
                    DurationDays = 60,
                    WorkoutsPerWeek = 4,
                    DifficultyLevel = "Intermediate",
                    TrainerId = trainerId,
                    IsActive = true,
                    IsPublic = true,
                    Status = "Active",
                    Thumbnail = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80",
                    EstimatedCaloriesBurn = 480,
                    Tags = "[\"HIIT\",\"Fat loss\",\"Conditioning\"]",
                };
                await _unitOfWork.WorkoutPlans.AddAsync(p);
                await _unitOfWork.SaveChangesAsync();
                var w1 = new WorkoutPlanWeek { WorkoutPlanId = p.Id, WeekNumber = 1, Name = "Metabolic Phase" };
                await _unitOfWork.WorkoutPlanWeeks.AddAsync(w1);
                await _unitOfWork.SaveChangesAsync();

                async Task<WorkoutPlanDay> D(int dow, string n, string f, bool r, int o) =>
                    await AddPremiumDayAsync(p.Id, w1.Id, dow, n, f, r, o);

                var d1 = await D(1, "Monday — Full Body Circuit", "Full body", false, 1);
                await AddPremiumExercisesAsync(p.Id, d1.Id, ExerciseId,
                    ("Burpees", 4, 10, 45, 1), ("Goblet Squat", 3, 12, 60, 2), ("Push-ups", 3, 12, 45, 3));
                var d2 = await D(2, "Tuesday — Active Recovery", "Mobility + core", false, 2);
                await AddPremiumExercisesAsync(p.Id, d2.Id, ExerciseId,
                    ("Jumping Jacks", 3, 30, 30, 1), ("Plank", 3, 40, 45, 2), ("Russian Twist", 3, 20, 45, 3));
                await D(3, "Wednesday — Rest", "Recovery", true, 3);
                var d4 = await D(4, "Thursday — Lower Power", "Legs + glutes", false, 4);
                await AddPremiumExercisesAsync(p.Id, d4.Id, ExerciseId,
                    ("Squats", 4, 10, 90, 1), ("Romanian Deadlift", 3, 10, 90, 2), ("Lunges", 3, 12, 60, 3));
                await D(5, "Friday — Rest", "Recovery", true, 5);
                var d6 = await D(6, "Saturday — HIIT Finisher", "Conditioning", false, 6);
                await AddPremiumExercisesAsync(p.Id, d6.Id, ExerciseId,
                    ("High Knees", 4, 30, 30, 1), ("Mountain Climbers", 4, 20, 30, 2), ("Jump Rope", 3, 60, 45, 3));
                await D(7, "Sunday — Rest", "Recovery", true, 7);
                await _unitOfWork.SaveChangesAsync();
            }

            // --- 3. Strength Builder — 120 Days ------------------------------------
            if (!await _unitOfWork.WorkoutPlans.ExistsAsync(p => p.Name == "Strength Builder - 120 Days"))
            {
                var p = new WorkoutPlan
                {
                    Name = "Strength Builder - 120 Days",
                    Description = "Long-wave strength periodization: heavy compounds, assistance work, and scheduled deloads every 4th week in structure.",
                    Goal = "Strength",
                    WorkoutType = WorkoutType.Strength,
                    Duration = 75,
                    DurationDays = 120,
                    WorkoutsPerWeek = 4,
                    DifficultyLevel = "Advanced",
                    TrainerId = trainerId,
                    IsActive = true,
                    IsPublic = true,
                    Status = "Active",
                    Thumbnail = "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1200&q=80",
                    EstimatedCaloriesBurn = 410,
                    Tags = "[\"Strength\",\"Barbell\",\"Periodization\"]",
                };
                await _unitOfWork.WorkoutPlans.AddAsync(p);
                await _unitOfWork.SaveChangesAsync();
                var w1 = new WorkoutPlanWeek { WorkoutPlanId = p.Id, WeekNumber = 1, Name = "Heavy Week" };
                await _unitOfWork.WorkoutPlanWeeks.AddAsync(w1);
                await _unitOfWork.SaveChangesAsync();

                var d1 = await AddPremiumDayAsync(p.Id, w1.Id, 1, "Monday — Squat emphasis", "Squat pattern", false, 1);
                await AddPremiumExercisesAsync(p.Id, d1.Id, ExerciseId,
                    ("Squats", 5, 5, 180, 1), ("Leg Press", 3, 8, 120, 2), ("Leg Extension", 3, 12, 60, 3));
                var d2 = await AddPremiumDayAsync(p.Id, w1.Id, 2, "Tuesday — Bench emphasis", "Horizontal push", false, 2);
                await AddPremiumExercisesAsync(p.Id, d2.Id, ExerciseId,
                    ("Bench Press", 5, 5, 180, 1), ("Close Grip Bench Press", 3, 8, 90, 2), ("Tricep Pushdown", 3, 12, 60, 3));
                await AddPremiumDayAsync(p.Id, w1.Id, 3, "Wednesday — Rest", "Recovery", true, 3);
                var d4 = await AddPremiumDayAsync(p.Id, w1.Id, 4, "Thursday — Deadlift emphasis", "Hinge", false, 4);
                await AddPremiumExercisesAsync(p.Id, d4.Id, ExerciseId,
                    ("Deadlift", 4, 4, 180, 1), ("Romanian Deadlift", 3, 8, 120, 2), ("Face Pull", 3, 15, 60, 3));
                var d5 = await AddPremiumDayAsync(p.Id, w1.Id, 5, "Friday — Overhead + Back", "Press + pull", false, 5);
                await AddPremiumExercisesAsync(p.Id, d5.Id, ExerciseId,
                    ("Overhead Press", 5, 5, 150, 1), ("Pull-ups", 4, 6, 120, 2), ("Bent-Over Row", 3, 8, 90, 3));
                await AddPremiumDayAsync(p.Id, w1.Id, 6, "Saturday — Rest", "Recovery", true, 6);
                await AddPremiumDayAsync(p.Id, w1.Id, 7, "Sunday — Rest", "Recovery", true, 7);
                await _unitOfWork.SaveChangesAsync();
            }

            // --- 4. Women Fitness Starter — 30 Days ---------------------------------
            if (!await _unitOfWork.WorkoutPlans.ExistsAsync(p => p.Name == "Women Fitness Starter - 30 Days"))
            {
                var p = new WorkoutPlan
                {
                    Name = "Women Fitness Starter - 30 Days",
                    Description = "Low-intimidation introduction: strength, core, and posture with 3 training days per week.",
                    Goal = "Beginner Fitness",
                    WorkoutType = WorkoutType.Strength,
                    Duration = 40,
                    DurationDays = 30,
                    WorkoutsPerWeek = 3,
                    DifficultyLevel = "Beginner",
                    TrainerId = trainerId,
                    IsActive = true,
                    IsPublic = true,
                    Status = "Active",
                    Thumbnail = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80",
                    EstimatedCaloriesBurn = 260,
                    Tags = "[\"Starter\",\"Wellness\",\"Core\"]",
                };
                await _unitOfWork.WorkoutPlans.AddAsync(p);
                await _unitOfWork.SaveChangesAsync();
                var w1 = new WorkoutPlanWeek { WorkoutPlanId = p.Id, WeekNumber = 1, Name = "Week 1" };
                await _unitOfWork.WorkoutPlanWeeks.AddAsync(w1);
                await _unitOfWork.SaveChangesAsync();

                var a = await AddPremiumDayAsync(p.Id, w1.Id, 1, "Monday — Full Body A", "Full body", false, 1);
                await AddPremiumExercisesAsync(p.Id, a.Id, ExerciseId,
                    ("Goblet Squat", 3, 10, 60, 1), ("Push-ups", 3, 8, 60, 2), ("Lat Pulldown", 3, 10, 60, 3), ("Plank", 3, 30, 45, 4));
                await AddPremiumDayAsync(p.Id, w1.Id, 2, "Tuesday — Rest", "Recovery", true, 2);
                var c = await AddPremiumDayAsync(p.Id, w1.Id, 3, "Wednesday — Full Body B", "Full body", false, 3);
                await AddPremiumExercisesAsync(p.Id, c.Id, ExerciseId,
                    ("Lunges", 3, 10, 60, 1), ("Dumbbell Fly", 3, 12, 45, 2), ("Seated Cable Row", 3, 12, 60, 3), ("Crunches", 3, 15, 45, 4));
                await AddPremiumDayAsync(p.Id, w1.Id, 4, "Thursday — Rest", "Recovery", true, 4);
                await AddPremiumDayAsync(p.Id, w1.Id, 5, "Friday — Rest", "Recovery", true, 5);
                var f = await AddPremiumDayAsync(p.Id, w1.Id, 6, "Saturday — Full Body C", "Full body", false, 6);
                await AddPremiumExercisesAsync(p.Id, f.Id, ExerciseId,
                    ("Hip Thrust", 3, 12, 75, 1), ("Overhead Press", 3, 10, 75, 2), ("Face Pull", 3, 15, 45, 3));
                await AddPremiumDayAsync(p.Id, w1.Id, 7, "Sunday — Rest", "Recovery", true, 7);
                await _unitOfWork.SaveChangesAsync();
            }

            // --- 5. Advanced Body Recomposition — 90 Days -----------------------------
            if (!await _unitOfWork.WorkoutPlans.ExistsAsync(p => p.Name == "Advanced Body Recomposition - 90 Days"))
            {
                var p = new WorkoutPlan
                {
                    Name = "Advanced Body Recomposition - 90 Days",
                    Description = "High-frequency upper/lower hybrid with conditioning finishers. Calorie deficit assumed outside the gym.",
                    Goal = "Fat Loss",
                    WorkoutType = WorkoutType.Strength,
                    Duration = 65,
                    DurationDays = 90,
                    WorkoutsPerWeek = 5,
                    DifficultyLevel = "Advanced",
                    TrainerId = trainerId,
                    IsActive = true,
                    IsPublic = true,
                    Status = "Active",
                    Thumbnail = "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200&q=80",
                    EstimatedCaloriesBurn = 450,
                    Tags = "[\"Recomp\",\"Advanced\",\"Hybrid\"]",
                };
                await _unitOfWork.WorkoutPlans.AddAsync(p);
                await _unitOfWork.SaveChangesAsync();
                var w1 = new WorkoutPlanWeek { WorkoutPlanId = p.Id, WeekNumber = 1, Name = "Volume block" };
                await _unitOfWork.WorkoutPlanWeeks.AddAsync(w1);
                await _unitOfWork.SaveChangesAsync();

                var u1 = await AddPremiumDayAsync(p.Id, w1.Id, 1, "Monday — Upper Hypertrophy", "Chest, back, arms", false, 1);
                await AddPremiumExercisesAsync(p.Id, u1.Id, ExerciseId,
                    ("Incline Dumbbell Press", 4, 10, 90, 1), ("Lat Pulldown", 4, 10, 90, 2), ("Cable Fly", 3, 12, 60, 3), ("Hammer Curls", 3, 12, 45, 4));
                var l1 = await AddPremiumDayAsync(p.Id, w1.Id, 2, "Tuesday — Lower Strength", "Legs", false, 2);
                await AddPremiumExercisesAsync(p.Id, l1.Id, ExerciseId,
                    ("Squats", 4, 6, 150, 1), ("Bulgarian Split Squat", 3, 10, 90, 2), ("Leg Curl", 3, 12, 60, 3));
                await AddPremiumDayAsync(p.Id, w1.Id, 3, "Wednesday — Rest", "Recovery", true, 3);
                var u2 = await AddPremiumDayAsync(p.Id, w1.Id, 4, "Thursday — Upper Strength", "Press + row", false, 4);
                await AddPremiumExercisesAsync(p.Id, u2.Id, ExerciseId,
                    ("Bench Press", 4, 6, 120, 1), ("Bent-Over Row", 4, 6, 120, 2), ("Lateral Raises", 4, 12, 45, 3));
                var l2 = await AddPremiumDayAsync(p.Id, w1.Id, 5, "Friday — Lower Hypertrophy + Core", "Legs + core", false, 5);
                await AddPremiumExercisesAsync(p.Id, l2.Id, ExerciseId,
                    ("Romanian Deadlift", 4, 8, 120, 1), ("Leg Press", 4, 12, 90, 2), ("Bicycle Crunch", 3, 20, 45, 3));
                await AddPremiumDayAsync(p.Id, w1.Id, 6, "Saturday — Rest", "Recovery", true, 6);
                await AddPremiumDayAsync(p.Id, w1.Id, 7, "Sunday — Rest", "Recovery", true, 7);
                await _unitOfWork.SaveChangesAsync();
            }
        }

        /// <summary>
        /// Seeds demo Equipment + MaintenanceLog records for the Gym Operations module.
        /// Idempotent: only inserts rows that do not already exist (matched by name/serial).
        /// Uses <see cref="ApplicationDbContext"/> directly because these tables are
        /// not exposed via the repository/UoW layer (module is isolated).
        /// </summary>
        private async Task SeedGymOpsEquipmentAndMaintenanceAsync()
        {
            var now = DateTime.UtcNow;

            // --- Equipment (12 items across all categories + statuses) ---------
            var equipmentSeeds = new[]
            {
                new Equipment
                {
                    Name = "Life Fitness Treadmill T5",
                    Category = "Cardio",
                    Brand = "Life Fitness",
                    SerialNumber = "LF-T5-10021",
                    Location = "Cardio Zone - Row A",
                    PurchaseDate = now.AddYears(-2).AddMonths(-3),
                    PurchaseCost = 4200m,
                    Status = "OPERATIONAL",
                    NextServiceDate = now.AddDays(18),
                    Notes = "Weekly belt inspection recommended.",
                    CreatedDate = now,
                },
                new Equipment
                {
                    Name = "Precor Elliptical EFX 635",
                    Category = "Cardio",
                    Brand = "Precor",
                    SerialNumber = "PR-EFX-22981",
                    Location = "Cardio Zone - Row B",
                    PurchaseDate = now.AddYears(-1).AddMonths(-6),
                    PurchaseCost = 3800m,
                    Status = "OPERATIONAL",
                    NextServiceDate = now.AddDays(45),
                    CreatedDate = now,
                },
                new Equipment
                {
                    Name = "Concept2 RowErg",
                    Category = "Cardio",
                    Brand = "Concept2",
                    SerialNumber = "C2-ROW-77211",
                    Location = "Functional Area",
                    PurchaseDate = now.AddYears(-1),
                    PurchaseCost = 1200m,
                    Status = "UNDER_MAINTENANCE",
                    NextServiceDate = now.AddDays(3),
                    Notes = "Monitor firmware update in progress.",
                    CreatedDate = now,
                },
                new Equipment
                {
                    Name = "Assault AirBike",
                    Category = "Cardio",
                    Brand = "Assault Fitness",
                    SerialNumber = "AF-AB-55402",
                    Location = "HIIT Zone",
                    PurchaseDate = now.AddMonths(-9),
                    PurchaseCost = 950m,
                    Status = "OPERATIONAL",
                    NextServiceDate = now.AddDays(60),
                    CreatedDate = now,
                },
                new Equipment
                {
                    Name = "Hammer Strength Iso-Lateral Chest Press",
                    Category = "Strength",
                    Brand = "Hammer Strength",
                    SerialNumber = "HS-CP-31004",
                    Location = "Strength Floor - Bay 1",
                    PurchaseDate = now.AddYears(-3),
                    PurchaseCost = 3500m,
                    Status = "OPERATIONAL",
                    NextServiceDate = now.AddDays(30),
                    CreatedDate = now,
                },
                new Equipment
                {
                    Name = "Rogue R-3 Power Rack",
                    Category = "Strength",
                    Brand = "Rogue Fitness",
                    SerialNumber = "RG-R3-99120",
                    Location = "Strength Floor - Bay 2",
                    PurchaseDate = now.AddYears(-2),
                    PurchaseCost = 1850m,
                    Status = "OPERATIONAL",
                    NextServiceDate = now.AddDays(90),
                    CreatedDate = now,
                },
                new Equipment
                {
                    Name = "Olympic Barbell 20kg",
                    Category = "Strength",
                    Brand = "Eleiko",
                    SerialNumber = "EL-OB-20-2217",
                    Location = "Strength Floor - Bay 2",
                    PurchaseDate = now.AddYears(-1),
                    PurchaseCost = 720m,
                    Status = "OPERATIONAL",
                    NextServiceDate = now.AddDays(120),
                    CreatedDate = now,
                },
                new Equipment
                {
                    Name = "Smith Machine LM-3310",
                    Category = "Strength",
                    Brand = "Matrix",
                    SerialNumber = "MX-SM-3310",
                    Location = "Strength Floor - Bay 3",
                    PurchaseDate = now.AddYears(-4),
                    PurchaseCost = 2900m,
                    Status = "OUT_OF_ORDER",
                    NextServiceDate = now.AddDays(-2),
                    Notes = "Cable fray detected. Awaiting parts from vendor.",
                    CreatedDate = now,
                },
                new Equipment
                {
                    Name = "TRX Suspension Trainer",
                    Category = "Functional",
                    Brand = "TRX",
                    SerialNumber = "TRX-ST-88812",
                    Location = "Functional Area",
                    PurchaseDate = now.AddMonths(-6),
                    PurchaseCost = 220m,
                    Status = "OPERATIONAL",
                    NextServiceDate = now.AddDays(75),
                    CreatedDate = now,
                },
                new Equipment
                {
                    Name = "Kettlebell Set (8–32kg)",
                    Category = "Functional",
                    Brand = "Rogue Fitness",
                    SerialNumber = "RG-KB-SET-01",
                    Location = "Functional Area",
                    PurchaseDate = now.AddYears(-2),
                    PurchaseCost = 1450m,
                    Status = "OPERATIONAL",
                    NextServiceDate = now.AddDays(180),
                    CreatedDate = now,
                },
                new Equipment
                {
                    Name = "Plyo Box Set",
                    Category = "Accessory",
                    Brand = "Titan Fitness",
                    SerialNumber = "TF-PB-SET-04",
                    Location = "Functional Area",
                    PurchaseDate = now.AddMonths(-14),
                    PurchaseCost = 480m,
                    Status = "OPERATIONAL",
                    NextServiceDate = now.AddDays(150),
                    CreatedDate = now,
                },
                new Equipment
                {
                    Name = "Foam Rollers (x12)",
                    Category = "Accessory",
                    Brand = "TriggerPoint",
                    SerialNumber = "TP-FR-12PACK",
                    Location = "Stretching Area",
                    PurchaseDate = now.AddMonths(-4),
                    PurchaseCost = 180m,
                    Status = "RETIRED",
                    Notes = "Replaced with new batch; keep for reference.",
                    CreatedDate = now,
                },
            };

            // Insert equipment that does not yet exist (match by SerialNumber fallback to Name)
            var seededEquipment = new List<Equipment>();
            foreach (var eq in equipmentSeeds)
            {
                Equipment? existing = null;
                if (!string.IsNullOrWhiteSpace(eq.SerialNumber))
                {
                    existing = await _context.GymOpsEquipment
                        .FirstOrDefaultAsync(e => e.SerialNumber == eq.SerialNumber);
                }
                existing ??= await _context.GymOpsEquipment
                    .FirstOrDefaultAsync(e => e.Name == eq.Name);

                if (existing == null)
                {
                    await _context.GymOpsEquipment.AddAsync(eq);
                    seededEquipment.Add(eq);
                }
                else
                {
                    seededEquipment.Add(existing);
                }
            }

            // Persist so we have IDs for maintenance FK
            await _context.SaveChangesAsync();

            // --- Maintenance Logs (several per a few pieces of equipment) -------
            Equipment? ByName(string name) =>
                seededEquipment.FirstOrDefault(e => e.Name == name);

            var treadmill = ByName("Life Fitness Treadmill T5");
            var rower = ByName("Concept2 RowErg");
            var smith = ByName("Smith Machine LM-3310");
            var rack = ByName("Rogue R-3 Power Rack");
            var bike = ByName("Assault AirBike");

            var maintenanceSeeds = new List<MaintenanceLog>();

            if (treadmill != null)
            {
                maintenanceSeeds.Add(new MaintenanceLog
                {
                    EquipmentId = treadmill.Id,
                    Type = "ROUTINE",
                    PerformedAt = now.AddDays(-30),
                    PerformedBy = "Ravi (in-house tech)",
                    Cost = 40m,
                    Description = "Belt lubrication and deck inspection. All readings nominal.",
                    NextServiceDate = now.AddDays(60),
                    CreatedDate = now,
                });
                maintenanceSeeds.Add(new MaintenanceLog
                {
                    EquipmentId = treadmill.Id,
                    Type = "INSPECTION",
                    PerformedAt = now.AddDays(-7),
                    PerformedBy = "Ravi (in-house tech)",
                    Cost = 0m,
                    Description = "Weekly visual inspection. Belt alignment ok; no slippage under load.",
                    NextServiceDate = now.AddDays(7),
                    CreatedDate = now,
                });
            }

            if (rower != null)
            {
                maintenanceSeeds.Add(new MaintenanceLog
                {
                    EquipmentId = rower.Id,
                    Type = "REPAIR",
                    PerformedAt = now.AddDays(-2),
                    PerformedBy = "Concept2 Service Partner",
                    Cost = 180m,
                    Description = "Monitor cable replaced; PM5 firmware updated to latest version.",
                    NextServiceDate = now.AddDays(3),
                    CreatedDate = now,
                });
            }

            if (smith != null)
            {
                maintenanceSeeds.Add(new MaintenanceLog
                {
                    EquipmentId = smith.Id,
                    Type = "INSPECTION",
                    PerformedAt = now.AddDays(-5),
                    PerformedBy = "Matrix Service (Vendor)",
                    Cost = 75m,
                    Description = "Identified cable fray on left rail. Marked OUT_OF_ORDER pending parts.",
                    NextServiceDate = now.AddDays(-2),
                    CreatedDate = now,
                });
                maintenanceSeeds.Add(new MaintenanceLog
                {
                    EquipmentId = smith.Id,
                    Type = "REPAIR",
                    PerformedAt = now.AddDays(-1),
                    PerformedBy = "Matrix Service (Vendor)",
                    Cost = 420m,
                    Description = "Cable replacement scheduled; quote approved, parts on order.",
                    CreatedDate = now,
                });
            }

            if (rack != null)
            {
                maintenanceSeeds.Add(new MaintenanceLog
                {
                    EquipmentId = rack.Id,
                    Type = "ROUTINE",
                    PerformedAt = now.AddDays(-45),
                    PerformedBy = "Ravi (in-house tech)",
                    Cost = 25m,
                    Description = "Bolts re-torqued, J-cups and safeties inspected. No issues.",
                    NextServiceDate = now.AddDays(90),
                    CreatedDate = now,
                });
            }

            if (bike != null)
            {
                maintenanceSeeds.Add(new MaintenanceLog
                {
                    EquipmentId = bike.Id,
                    Type = "ROUTINE",
                    PerformedAt = now.AddDays(-20),
                    PerformedBy = "Ravi (in-house tech)",
                    Cost = 30m,
                    Description = "Chain tensioned, fan housing cleaned, pedal bearings greased.",
                    NextServiceDate = now.AddDays(60),
                    CreatedDate = now,
                });
            }

            // Insert maintenance logs that do not already exist.
            // Match on (EquipmentId + PerformedAt + Description) which is a good enough
            // natural key for seeded demo rows and keeps this idempotent.
            foreach (var log in maintenanceSeeds)
            {
                var exists = await _context.GymOpsMaintenanceLogs.AnyAsync(m =>
                    m.EquipmentId == log.EquipmentId &&
                    m.PerformedAt == log.PerformedAt &&
                    m.Description == log.Description);
                if (!exists)
                {
                    await _context.GymOpsMaintenanceLogs.AddAsync(log);
                }
            }
        }

    }
}

