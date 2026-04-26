using Microsoft.EntityFrameworkCore;
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

            // Seed Body Parts
            var bodyParts = await SeedBodyPartsAsync();

            // Seed Body Part Muscles
            await SeedBodyPartMusclesAsync(bodyParts);

            // Seed Exercises
            await SeedExercisesAsync(bodyParts);

            // Seed Workout Plans
            await SeedWorkoutPlansAsync();

            // Seed Diet Plans (with meals and meal items)
            await SeedDietPlansAsync();

            await _unitOfWork.SaveChangesAsync();

            // Seed Gym Operations demo data (Equipment + MaintenanceLogs).
            // Kept isolated in GymOps tables; idempotent.
            await SeedGymOpsEquipmentAndMaintenanceAsync();
            await _context.SaveChangesAsync();
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

        /// <summary>
        /// Ensures canonical application roles exist in <c>Roles</c> (see migration seed: ADMIN, STAFF, TRAINER, MEMBER).
        /// </summary>
        private async Task EnsureRolesExistAsync()
        {
            var roleNames = new[] { "ADMIN", "STAFF", "TRAINER", "MEMBER" };
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
                new { Code = "TrainerAccess", Name = "Trainer access", Description = "Access to trainer/instructor features" },
                new { Code = "UsersAccess", Name = "Users access", Description = "Access to users and member data" },
                new { Code = "CREATE_MEMBER", Name = "Create member", Description = "Create new member / user accounts" },
                new { Code = "VIEW_ATTENDANCE", Name = "View attendance", Description = "View attendance logs and statistics" },
                new { Code = "MANAGE_ATTENDANCE", Name = "Manage attendance", Description = "Check-in, check-out, and edit attendance" },
                new { Code = "MANAGE_MEMBERS", Name = "Manage members", Description = "Update or delete users and profile details" },
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

        private async Task SeedExercisesAsync(Dictionary<string, BodyPart> bodyParts)
        {
            var exercises = new List<Exercise>();

            // Chest Exercises
            if (bodyParts.ContainsKey("Chest"))
            {
                exercises.AddRange(new[]
                {
                    new Exercise
                    {
                        Name = "Push-ups",
                        Description = "Basic bodyweight chest exercise",
                        Steps = "1. Start in plank position\n2. Lower your body until chest nearly touches floor\n3. Push back up to starting position\n4. Repeat for desired reps",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "None",
                        BodyPartId = bodyParts["Chest"].Id,
                        CreatedDate = DateTime.UtcNow
                    },
                    new Exercise
                    {
                        Name = "Bench Press",
                        Description = "Classic chest strength exercise",
                        Steps = "1. Lie on bench with barbell at chest level\n2. Lower bar to chest with control\n3. Press bar up until arms are fully extended\n4. Repeat",
                        DifficultyLevel = "Intermediate",
                        EquipmentRequired = "Barbell, Bench, Weights",
                        BodyPartId = bodyParts["Chest"].Id,
                        CreatedDate = DateTime.UtcNow
                    },
                    new Exercise
                    {
                        Name = "Incline Dumbbell Press",
                        Description = "Upper chest development",
                        Steps = "1. Set bench to 30-45 degree incline\n2. Hold dumbbells at shoulder level\n3. Press up and slightly forward\n4. Lower with control",
                        DifficultyLevel = "Intermediate",
                        EquipmentRequired = "Dumbbells, Incline Bench",
                        BodyPartId = bodyParts["Chest"].Id,
                        CreatedDate = DateTime.UtcNow
                    }
                });
            }

            // Back Exercises
            if (bodyParts.ContainsKey("Back"))
            {
                exercises.AddRange(new[]
                {
                    new Exercise
                    {
                        Name = "Pull-ups",
                        Description = "Upper body strength exercise",
                        Steps = "1. Hang from bar with overhand grip\n2. Pull body up until chin clears bar\n3. Lower with control\n4. Repeat",
                        DifficultyLevel = "Intermediate",
                        EquipmentRequired = "Pull-up Bar",
                        BodyPartId = bodyParts["Back"].Id,
                        CreatedDate = DateTime.UtcNow
                    },
                    new Exercise
                    {
                        Name = "Bent-Over Row",
                        Description = "Back muscle development",
                        Steps = "1. Bend forward at waist with slight knee bend\n2. Pull barbell to lower chest\n3. Squeeze shoulder blades together\n4. Lower with control",
                        DifficultyLevel = "Intermediate",
                        EquipmentRequired = "Barbell, Weights",
                        BodyPartId = bodyParts["Back"].Id,
                        CreatedDate = DateTime.UtcNow
                    },
                    new Exercise
                    {
                        Name = "Lat Pulldown",
                        Description = "Targets latissimus dorsi",
                        Steps = "1. Sit at lat pulldown machine\n2. Pull bar to upper chest\n3. Squeeze lats at bottom\n4. Return to starting position",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "Lat Pulldown Machine",
                        BodyPartId = bodyParts["Back"].Id,
                        CreatedDate = DateTime.UtcNow
                    }
                });
            }

            // Shoulder Exercises
            if (bodyParts.ContainsKey("Shoulders"))
            {
                exercises.AddRange(new[]
                {
                    new Exercise
                    {
                        Name = "Overhead Press",
                        Description = "Shoulder strength exercise",
                        Steps = "1. Stand with feet shoulder-width apart\n2. Press barbell overhead until arms are straight\n3. Lower to shoulder level\n4. Repeat",
                        DifficultyLevel = "Intermediate",
                        EquipmentRequired = "Barbell, Weights",
                        BodyPartId = bodyParts["Shoulders"].Id,
                        CreatedDate = DateTime.UtcNow
                    },
                    new Exercise
                    {
                        Name = "Lateral Raises",
                        Description = "Shoulder width development",
                        Steps = "1. Hold dumbbells at sides\n2. Raise arms out to sides until parallel to floor\n3. Lower with control\n4. Repeat",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "Dumbbells",
                        BodyPartId = bodyParts["Shoulders"].Id,
                        CreatedDate = DateTime.UtcNow
                    }
                });
            }

            // Biceps Exercises
            if (bodyParts.ContainsKey("Biceps"))
            {
                exercises.AddRange(new[]
                {
                    new Exercise
                    {
                        Name = "Bicep Curls",
                        Description = "Biceps development",
                        Steps = "1. Hold dumbbells with arms at sides\n2. Curl weights up to shoulders\n3. Squeeze biceps at top\n4. Lower with control",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "Dumbbells",
                        BodyPartId = bodyParts["Biceps"].Id,
                        CreatedDate = DateTime.UtcNow
                    },
                    new Exercise
                    {
                        Name = "Hammer Curls",
                        Description = "Biceps and forearms",
                        Steps = "1. Hold dumbbells with neutral grip\n2. Curl weights up\n3. Keep wrists straight\n4. Lower with control",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "Dumbbells",
                        BodyPartId = bodyParts["Biceps"].Id,
                        CreatedDate = DateTime.UtcNow
                    }
                });
            }

            // Triceps Exercises
            if (bodyParts.ContainsKey("Triceps"))
            {
                exercises.AddRange(new[]
                {
                    new Exercise
                    {
                        Name = "Tricep Dips",
                        Description = "Triceps and shoulders",
                        Steps = "1. Sit on edge of bench\n2. Lower body by bending arms\n3. Press back up\n4. Repeat",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "Bench",
                        BodyPartId = bodyParts["Triceps"].Id,
                        CreatedDate = DateTime.UtcNow
                    },
                    new Exercise
                    {
                        Name = "Overhead Tricep Extension",
                        Description = "Triceps isolation",
                        Steps = "1. Hold dumbbell overhead\n2. Lower behind head by bending elbows\n3. Extend back up\n4. Repeat",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "Dumbbell",
                        BodyPartId = bodyParts["Triceps"].Id,
                        CreatedDate = DateTime.UtcNow
                    }
                });
            }

            // Leg Exercises
            if (bodyParts.ContainsKey("Legs"))
            {
                exercises.AddRange(new[]
                {
                    new Exercise
                    {
                        Name = "Squats",
                        Description = "Full leg development",
                        Steps = "1. Stand with feet shoulder-width apart\n2. Lower as if sitting in chair\n3. Keep knees behind toes\n4. Return to standing",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "None (or Barbell for weighted)",
                        BodyPartId = bodyParts["Legs"].Id,
                        CreatedDate = DateTime.UtcNow
                    },
                    new Exercise
                    {
                        Name = "Lunges",
                        Description = "Legs and glutes",
                        Steps = "1. Step forward into lunge position\n2. Lower back knee toward ground\n3. Push back to starting position\n4. Alternate legs",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "None (or Dumbbells for weighted)",
                        BodyPartId = bodyParts["Legs"].Id,
                        CreatedDate = DateTime.UtcNow
                    },
                    new Exercise
                    {
                        Name = "Leg Press",
                        Description = "Quadriceps and glutes",
                        Steps = "1. Sit in leg press machine\n2. Lower weight by bending knees\n3. Press back up\n4. Repeat",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "Leg Press Machine",
                        BodyPartId = bodyParts["Legs"].Id,
                        CreatedDate = DateTime.UtcNow
                    }
                });
            }

            // Abs Exercises
            if (bodyParts.ContainsKey("Abs"))
            {
                exercises.AddRange(new[]
                {
                    new Exercise
                    {
                        Name = "Crunches",
                        Description = "Upper abdominals",
                        Steps = "1. Lie on back with knees bent\n2. Lift shoulders toward knees\n3. Contract abs\n4. Lower with control",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "None",
                        BodyPartId = bodyParts["Abs"].Id,
                        CreatedDate = DateTime.UtcNow
                    },
                    new Exercise
                    {
                        Name = "Plank",
                        Description = "Core strength",
                        Steps = "1. Hold plank position\n2. Keep body straight\n3. Engage core\n4. Hold for desired time",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "None",
                        BodyPartId = bodyParts["Abs"].Id,
                        CreatedDate = DateTime.UtcNow
                    },
                    new Exercise
                    {
                        Name = "Leg Raises",
                        Description = "Lower abdominals",
                        Steps = "1. Lie on back\n2. Raise legs until perpendicular to floor\n3. Lower with control\n4. Repeat",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "None",
                        BodyPartId = bodyParts["Abs"].Id,
                        CreatedDate = DateTime.UtcNow
                    }
                });
            }

            // Cardio Exercises
            if (bodyParts.ContainsKey("Cardio"))
            {
                exercises.AddRange(new[]
                {
                    new Exercise
                    {
                        Name = "Jumping Jacks",
                        Description = "Full body cardio",
                        Steps = "1. Stand with feet together\n2. Jump while raising arms and spreading legs\n3. Return to start\n4. Repeat continuously",
                        DifficultyLevel = "Beginner",
                        EquipmentRequired = "None",
                        BodyPartId = bodyParts["Cardio"].Id,
                        CreatedDate = DateTime.UtcNow
                    },
                    new Exercise
                    {
                        Name = "Burpees",
                        Description = "High intensity cardio",
                        Steps = "1. Squat down and place hands on floor\n2. Jump back to plank position\n3. Do a push-up\n4. Jump back to squat and jump up",
                        DifficultyLevel = "Intermediate",
                        EquipmentRequired = "None",
                        BodyPartId = bodyParts["Cardio"].Id,
                        CreatedDate = DateTime.UtcNow
                    },
                    new Exercise
                    {
                        Name = "Mountain Climbers",
                        Description = "Cardio and core",
                        Steps = "1. Start in plank position\n2. Alternate bringing knees to chest\n3. Keep core engaged\n4. Move quickly",
                        DifficultyLevel = "Intermediate",
                        EquipmentRequired = "None",
                        BodyPartId = bodyParts["Cardio"].Id,
                        CreatedDate = DateTime.UtcNow
                    }
                });
            }

            // Add exercises if they don't exist
            foreach (var exercise in exercises)
            {
                var exists = await _unitOfWork.Exercises
                    .ExistsAsync(e => e.Name == exercise.Name && e.BodyPartId == exercise.BodyPartId);
                
                if (!exists)
                {
                    await _unitOfWork.Exercises.AddAsync(exercise);
                }
            }
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

