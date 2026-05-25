using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;

namespace GymManagement.API.Controllers
{
    /// <summary>
    /// Self-service endpoints for the authenticated member's mobile app.
    /// All actions read the user from the JWT (no permission checks beyond <see cref="AuthorizeAttribute"/>).
    /// </summary>
    [ApiController]
    [Route("api/me")]
    [Authorize]
    public class MeController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IMembershipPaymentService _membershipPaymentService;

        public MeController(ApplicationDbContext db, IMembershipPaymentService membershipPaymentService)
        {
            _db = db;
            _membershipPaymentService = membershipPaymentService;
        }

        /// <summary>Payment gate info for mobile / member apps (allowed while access is otherwise blocked).</summary>
        [HttpGet("membership-billing/access")]
        public async Task<ActionResult<MemberBillingAccessDto>> GetMembershipBillingAccess()
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();
            return Ok(await _membershipPaymentService.GetMemberBillingAccessAsync(userId.Value));
        }

        /// <summary>Aggregate dashboard for the home screen of the mobile app.</summary>
        [HttpGet("dashboard")]
        public async Task<ActionResult<MeDashboardDto>> GetDashboard()
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();

            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value);
            if (user == null) return NotFound();

            var auth = await _db.AuthUsers.AsNoTracking().FirstOrDefaultAsync(a => a.UserId == userId.Value);

            var profile = MapProfile(user, auth?.Email);

            var membership = await GetActiveMembershipAsync(userId.Value);
            var attendance = await BuildAttendanceSummaryAsync(userId.Value);
            var latestMetric = await GetLatestBodyMetricAsync(userId.Value);
            var schedule = await GetUpcomingScheduleAsync(userId.Value);
            var notifications = await GetRecentNotificationsAsync(userId.Value);

            return Ok(new MeDashboardDto
            {
                Profile = profile,
                Membership = membership,
                Attendance = attendance,
                LatestBodyMetric = latestMetric,
                UpcomingSchedule = schedule,
                RecentNotifications = notifications
            });
        }

        /// <summary>Profile of the authenticated user.</summary>
        [HttpGet("profile")]
        public async Task<ActionResult<MeProfileDto>> GetProfile()
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();

            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value);
            if (user == null) return NotFound();

            var auth = await _db.AuthUsers.AsNoTracking().FirstOrDefaultAsync(a => a.UserId == userId.Value);
            return Ok(MapProfile(user, auth?.Email));
        }

        /// <summary>Update editable profile fields for the authenticated member.</summary>
        [HttpPut("profile")]
        public async Task<ActionResult<MeProfileDto>> UpdateProfile(
            [FromBody] MeUpdateProfileDto dto,
            CancellationToken cancellationToken = default)
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, cancellationToken);
            if (user == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.FirstName))
                user.FirstName = dto.FirstName.Trim();
            if (!string.IsNullOrWhiteSpace(dto.LastName))
                user.LastName = dto.LastName.Trim();
            if (dto.Phone != null)
                user.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();
            if (dto.ProfilePictureUrl != null)
                user.ProfilePictureUrl = string.IsNullOrWhiteSpace(dto.ProfilePictureUrl)
                    ? null
                    : dto.ProfilePictureUrl.Trim();

            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            var auth = await _db.AuthUsers.AsNoTracking().FirstOrDefaultAsync(a => a.UserId == userId.Value, cancellationToken);
            return Ok(MapProfile(user, auth?.Email));
        }

        /// <summary>Active or most-recent membership.</summary>
        [HttpGet("membership")]
        public async Task<ActionResult<MeMembershipDto?>> GetMembership()
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();

            var membership = await GetActiveMembershipAsync(userId.Value);
            return Ok(membership);
        }

        /// <summary>Attendance summary (this month/week/streak + last 30 days flags).</summary>
        [HttpGet("attendance")]
        public async Task<ActionResult<MeAttendanceSummaryDto>> GetAttendance()
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();

            return Ok(await BuildAttendanceSummaryAsync(userId.Value));
        }

        /// <summary>Body metric history (latest first).</summary>
        [HttpGet("body-metrics")]
        public async Task<ActionResult<IReadOnlyList<MeBodyMetricLogDto>>> GetBodyMetrics([FromQuery] int take = 60)
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();

            if (take <= 0) take = 60;
            if (take > 365) take = 365;

            var rows = await _db.BodyMetricsLogs.AsNoTracking()
                .Where(b => b.UserId == userId.Value && !b.IsDeleted)
                .OrderByDescending(b => b.MeasurementDate)
                .Take(take)
                .ToListAsync();

            var result = rows.Select(MapMetricLog).ToList();
            return Ok(result);
        }

        /// <summary>Notifications for this user (latest first).</summary>
        [HttpGet("notifications")]
        public async Task<ActionResult<IReadOnlyList<MeNotificationDto>>> GetNotifications([FromQuery] int take = 30)
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();

            if (take <= 0) take = 30;
            if (take > 200) take = 200;

            var notifications = await _db.Notifications.AsNoTracking()
                .Where(n => n.UserId == userId.Value)
                .OrderByDescending(n => n.CreatedDate)
                .Take(take)
                .ToListAsync();

            return Ok(notifications.Select(MapNotification).ToList());
        }

        /// <summary>Workout plans assigned to the member via active <see cref="UserSchedule"/> rows.</summary>
        [HttpGet("workout-plans")]
        public async Task<ActionResult<IReadOnlyList<MeWorkoutPlanSummaryDto>>> GetWorkoutPlans()
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();

            var assignedPlanIds = await _db.UserSchedules.AsNoTracking()
                .Where(s => s.UserId == userId.Value && s.IsActive)
                .Select(s => s.WorkoutPlanId)
                .Distinct()
                .ToListAsync()
                .ConfigureAwait(false);

            if (assignedPlanIds.Count == 0)
                return Ok(Array.Empty<MeWorkoutPlanSummaryDto>());

            var rows = await _db.WorkoutPlans.AsNoTracking()
                .Where(p => assignedPlanIds.Contains(p.Id) && p.IsActive && !p.IsDeleted)
                .OrderBy(p => p.Name)
                .Select(p => new MeWorkoutPlanSummaryDto
                {
                    Id = p.Id,
                    PlanName = p.Name,
                    WorkoutType = p.WorkoutType.ToString(),
                    DifficultyLevel = p.DifficultyLevel,
                    DurationMinutes = p.Duration,
                    Description = p.Description,
                    ExerciseCount = p.WorkoutPlanExercises.Count(e => !e.IsDeleted),
                    Goal = p.Goal,
                    DurationDays = p.DurationDays,
                    WorkoutsPerWeek = p.WorkoutsPerWeek
                })
                .ToListAsync()
                .ConfigureAwait(false);

            return Ok(rows);
        }

        /// <summary>All assigned programs with weekly time slots and every plan day / exercise (member hub).</summary>
        [HttpGet("workout-program")]
        public async Task<ActionResult<MeWorkoutProgramDto>> GetWorkoutProgram()
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();

            var assignedPlanIds = await _db.UserSchedules.AsNoTracking()
                .Where(s => s.UserId == userId.Value && s.IsActive)
                .Select(s => s.WorkoutPlanId)
                .Distinct()
                .ToListAsync()
                .ConfigureAwait(false);

            if (assignedPlanIds.Count == 0)
                return Ok(new MeWorkoutProgramDto { Programs = Array.Empty<MeAssignedProgramDto>() });

            var allSchedules = await _db.UserSchedules.AsNoTracking()
                .Where(s => s.UserId == userId.Value && s.IsActive && assignedPlanIds.Contains(s.WorkoutPlanId))
                .OrderBy(s => s.WorkoutPlanId)
                .ThenBy(s => s.DayOfWeek)
                .ThenBy(s => s.StartTime)
                .ToListAsync()
                .ConfigureAwait(false);

            var trainerIds = allSchedules.Where(s => s.TrainerId != null).Select(s => s.TrainerId!.Value).Distinct().ToList();
            var trainerNames = new Dictionary<int, string?>();
            if (trainerIds.Count > 0)
            {
                var trainers = await _db.Trainers.AsNoTracking()
                    .Where(t => trainerIds.Contains(t.Id))
                    .ToListAsync()
                    .ConfigureAwait(false);
                var userIds = trainers.Select(t => t.UserId).Distinct().ToList();
                var users = await _db.Users.AsNoTracking()
                    .Where(u => userIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id, u => u)
                    .ConfigureAwait(false);
                foreach (var t in trainers)
                {
                    if (users.TryGetValue(t.UserId, out var u))
                        trainerNames[t.Id] = $"{u.FirstName} {u.LastName}".Trim();
                    else
                        trainerNames[t.Id] = null;
                }
            }

            var programs = new List<MeAssignedProgramDto>();

            foreach (var planId in assignedPlanIds.OrderBy(id => id))
            {
                var plan = await _db.WorkoutPlans.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == planId && !p.IsDeleted && p.IsActive)
                    .ConfigureAwait(false);
                if (plan == null) continue;

                var slots = allSchedules
                    .Where(s => s.WorkoutPlanId == planId)
                    .Select(s => new MeMemberScheduleSlotDto
                    {
                        ScheduleId = s.Id,
                        ScheduleType = s.ScheduleType.ToString(),
                        DayOfWeek = (int)s.DayOfWeek,
                        StartTime = s.StartTime.ToString(@"hh\:mm"),
                        EndTime = s.EndTime.ToString(@"hh\:mm"),
                        TrainerName = s.TrainerId.HasValue && trainerNames.TryGetValue(s.TrainerId.Value, out var nm) ? nm : null
                    })
                    .ToList();

                var allLines = await _db.WorkoutPlanExercises.AsNoTracking()
                    .Where(e => e.WorkoutPlanId == planId && !e.IsDeleted)
                    .Include(e => e.Exercise)
                    .ThenInclude(ex => ex.BodyPart)
                    .OrderBy(e => e.Order)
                    .ToListAsync()
                    .ConfigureAwait(false);

                var planDays = await _db.WorkoutPlanDays.AsNoTracking()
                    .Where(d => d.WorkoutPlanId == planId && !d.IsDeleted)
                    .OrderBy(d => d.DayNumber)
                    .ThenBy(d => d.OrderIndex)
                    .ToListAsync()
                    .ConfigureAwait(false);

                var hasDayAssigned = allLines.Any(e => e.WorkoutPlanDayId != null);
                var dayOutlines = new List<MePlanDayOutlineDto>();
                var exerciseIds = allLines.Select(x => x.ExerciseId).Distinct().ToList();
                var lastByExercise = await GetLastLogByExerciseAsync(userId.Value, exerciseIds).ConfigureAwait(false);

                if (!hasDayAssigned)
                {
                    dayOutlines.Add(new MePlanDayOutlineDto
                    {
                        PlanDayId = 0,
                        DayNumber = 0,
                        Name = "Full program",
                        IsRestDay = false,
                        FocusArea = null,
                        Exercises = MapMeExerciseLines(allLines.OrderBy(e => e.Order), lastByExercise)
                    });
                }
                else
                {
                    foreach (var pd in planDays)
                    {
                        if (pd.IsRestDay)
                        {
                            dayOutlines.Add(new MePlanDayOutlineDto
                            {
                                PlanDayId = pd.Id,
                                DayNumber = pd.DayNumber,
                                Name = string.IsNullOrWhiteSpace(pd.Name) ? $"Day {pd.DayNumber}" : pd.Name,
                                IsRestDay = true,
                                FocusArea = pd.FocusArea,
                                Exercises = Array.Empty<MeWorkoutExerciseLineDto>()
                            });
                            continue;
                        }

                        var forDay = allLines.Where(e => e.WorkoutPlanDayId == pd.Id).OrderBy(e => e.Order).ToList();
                        if (forDay.Count == 0)
                            continue;

                        dayOutlines.Add(new MePlanDayOutlineDto
                        {
                            PlanDayId = pd.Id,
                            DayNumber = pd.DayNumber,
                            Name = string.IsNullOrWhiteSpace(pd.Name) ? $"Day {pd.DayNumber}" : pd.Name,
                            IsRestDay = false,
                            FocusArea = pd.FocusArea,
                            Exercises = MapMeExerciseLines(forDay, lastByExercise)
                        });
                    }

                    var orphanLines = allLines.Where(e => e.WorkoutPlanDayId == null).OrderBy(e => e.Order).ToList();
                    if (orphanLines.Count > 0)
                    {
                        dayOutlines.Add(new MePlanDayOutlineDto
                        {
                            PlanDayId = 0,
                            DayNumber = 99,
                            Name = "Additional exercises",
                            IsRestDay = false,
                            FocusArea = null,
                            Exercises = MapMeExerciseLines(orphanLines, lastByExercise)
                        });
                    }
                }

                var totalExercises = dayOutlines.Sum(d => d.Exercises.Count);
                var planSummary = new MeWorkoutPlanSummaryDto
                {
                    Id = plan.Id,
                    PlanName = plan.Name,
                    WorkoutType = plan.WorkoutType.ToString(),
                    DifficultyLevel = plan.DifficultyLevel,
                    DurationMinutes = plan.Duration > 0 ? plan.Duration : null,
                    Description = plan.Description,
                    ExerciseCount = totalExercises,
                    Goal = plan.Goal,
                    DurationDays = plan.DurationDays,
                    WorkoutsPerWeek = plan.WorkoutsPerWeek
                };

                programs.Add(new MeAssignedProgramDto
                {
                    Plan = planSummary,
                    ScheduleSlots = slots,
                    Days = dayOutlines
                });
            }

            programs.Sort((a, b) => string.CompareOrdinal(a.Plan.PlanName, b.Plan.PlanName));
            return Ok(new MeWorkoutProgramDto { Programs = programs });
        }

        /// <summary>Active diet plan assigned to the member (meals included).</summary>
        [HttpGet("diet-plan")]
        public async Task<ActionResult<MeDietPlanDto>> GetDietPlan()
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();

            var today = DateTime.UtcNow.Date;
            var assignment = await _db.UserDietPlans.AsNoTracking()
                .Include(u => u.DietPlan)
                    .ThenInclude(d => d.DietMeals)
                    .ThenInclude(m => m.DietMealItems)
                .Where(u => u.UserId == userId.Value
                    && u.IsActive
                    && !u.IsDeleted
                    && u.DietPlan.IsActive
                    && !u.DietPlan.IsDeleted
                    && u.StartDate.Date <= today
                    && (u.EndDate == null || u.EndDate.Value.Date >= today))
                .OrderByDescending(u => u.StartDate)
                .FirstOrDefaultAsync()
                .ConfigureAwait(false);

            if (assignment?.DietPlan == null)
                return NotFound();

            var plan = assignment.DietPlan;
            return Ok(new MeDietPlanDto
            {
                AssignmentId = assignment.Id,
                DietPlanId = plan.Id,
                PlanName = plan.PlanName,
                GoalType = plan.GoalType,
                Calories = plan.Calories,
                ProteinGrams = plan.ProteinGrams,
                CarbsGrams = plan.CarbsGrams,
                FatsGrams = plan.FatsGrams,
                Description = plan.Description,
                StartDate = assignment.StartDate,
                EndDate = assignment.EndDate,
                Meals = plan.DietMeals
                    .OrderBy(m => m.MealOrder)
                    .Select(m => new MeDietMealDto
                    {
                        Id = m.Id,
                        MealName = m.MealName,
                        MealOrder = m.MealOrder,
                        Items = m.DietMealItems
                            .Select(i => new MeDietMealItemDto
                            {
                                Id = i.Id,
                                FoodName = i.FoodName,
                                Quantity = i.Quantity,
                                Calories = i.Calories,
                                ProteinGrams = i.ProteinGrams,
                                CarbsGrams = i.CarbsGrams,
                                FatsGrams = i.FatsGrams
                            })
                            .ToList()
                    })
                    .ToList()
            });
        }

        /// <summary>
        /// Plan exercises plus last logged weight/reps. When the plan splits by <c>WorkoutPlanDay</c>, only today's
        /// block is returned (local weekday from <paramref name="utcOffsetMinutes"/>; default 0 = UTC).
        /// </summary>
        [HttpGet("workout-plans/{planId:int}/session")]
        public async Task<ActionResult<MeWorkoutSessionTemplateDto>> GetWorkoutSessionTemplate(
            [FromRoute] int planId,
            [FromQuery] int? utcOffsetMinutes = null)
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();

            var plan = await _db.WorkoutPlans.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == planId && !p.IsDeleted && p.IsActive);
            if (plan == null) return NotFound();

            var allLines = await _db.WorkoutPlanExercises.AsNoTracking()
                .Where(e => e.WorkoutPlanId == planId && !e.IsDeleted)
                .Include(e => e.Exercise)
                .ThenInclude(ex => ex.BodyPart)
                .OrderBy(e => e.Order)
                .ToListAsync()
                .ConfigureAwait(false);

            var planDays = await _db.WorkoutPlanDays.AsNoTracking()
                .Where(d => d.WorkoutPlanId == planId)
                .ToListAsync()
                .ConfigureAwait(false);

            var localDow = LocalDayOfWeekFromUtcOffset(utcOffsetMinutes);
            var isoWeekday = IsoWeekdayNumber(localDow);
            var targetPlanDay = planDays.FirstOrDefault(d => d.DayNumber == isoWeekday);
            var hasDayAssignedExercises = allLines.Any(e => e.WorkoutPlanDayId != null);

            var hasAnyScheduleForPlan = await _db.UserSchedules.AsNoTracking().AnyAsync(s =>
                s.UserId == userId.Value
                && s.WorkoutPlanId == planId
                && s.IsActive).ConfigureAwait(false);
            var hasScheduleThisLocalWeekday = await _db.UserSchedules.AsNoTracking().AnyAsync(s =>
                s.UserId == userId.Value
                && s.WorkoutPlanId == planId
                && s.IsActive
                && s.DayOfWeek == localDow).ConfigureAwait(false);
            var isScheduledToday = !hasAnyScheduleForPlan || hasScheduleThisLocalWeekday;

            var filteredToToday = false;
            var isRestDay = false;
            string? todayDayName = null;
            List<WorkoutPlanExercise> lineEntities;

            if (hasDayAssignedExercises && targetPlanDay != null)
            {
                filteredToToday = true;
                if (!string.IsNullOrWhiteSpace(targetPlanDay.Name))
                    todayDayName = targetPlanDay.Name;

                if (targetPlanDay.IsRestDay)
                {
                    isRestDay = true;
                    lineEntities = new List<WorkoutPlanExercise>();
                }
                else
                {
                    var forDay = allLines
                        .Where(e => e.WorkoutPlanDayId == targetPlanDay.Id)
                        .OrderBy(e => e.Order)
                        .ToList();
                    if (forDay.Count == 0)
                    {
                        lineEntities = allLines;
                        filteredToToday = false;
                        todayDayName = null;
                    }
                    else
                    {
                        lineEntities = forDay;
                    }
                }
            }
            else
            {
                lineEntities = allLines;
            }

            var exerciseIds = lineEntities.Select(x => x.ExerciseId).Distinct().ToList();
            var lastByExercise = await GetLastLogByExerciseAsync(userId.Value, exerciseIds).ConfigureAwait(false);

            var exercises = lineEntities.Select(wpe =>
            {
                DateTime? lastDate = null;
                decimal? lastWeight = null;
                int? lastReps = null;
                if (lastByExercise.TryGetValue(wpe.ExerciseId, out var last))
                {
                    lastDate = last.SessionDate;
                    lastWeight = last.WeightUsed;
                    lastReps = last.RepsDone;
                }

                return new MeWorkoutExerciseLineDto
                {
                    PlanExerciseId = wpe.Id,
                    ExerciseId = wpe.ExerciseId,
                    ExerciseName = wpe.Exercise.Name,
                    BodyPartName = wpe.Exercise.BodyPart?.Name,
                    Order = wpe.Order,
                    TargetSets = wpe.Sets,
                    TargetReps = wpe.Reps,
                    RestSeconds = wpe.RestBetweenSets,
                    SuggestedWeight = wpe.Weight,
                    LastSessionDateUtc = lastDate,
                    LastWeightUsed = lastWeight,
                    LastRepsDone = lastReps
                };
            }).ToList();

            var summary = new MeWorkoutPlanSummaryDto
            {
                Id = plan.Id,
                PlanName = plan.Name,
                WorkoutType = plan.WorkoutType.ToString(),
                DifficultyLevel = plan.DifficultyLevel,
                DurationMinutes = plan.Duration > 0 ? plan.Duration : null,
                Description = plan.Description,
                ExerciseCount = exercises.Count
            };

            return Ok(new MeWorkoutSessionTemplateDto
            {
                Plan = summary,
                Exercises = exercises,
                FilteredToToday = filteredToToday,
                IsRestDay = isRestDay,
                TodayDayName = todayDayName,
                IsScheduledToday = isScheduledToday
            });
        }

        /// <summary>Complete a strength session — creates <see cref="WorkoutSession"/> and <see cref="WorkoutLog"/> rows.</summary>
        [HttpPost("workout-sessions/complete")]
        public async Task<ActionResult<MeWorkoutSessionCompletedDto>> CompleteWorkoutSession(
            [FromBody] MeCompleteWorkoutSessionDto dto,
            CancellationToken cancellationToken = default)
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();

            if (dto.WorkoutPlanId <= 0)
                return BadRequest(new { message = "WorkoutPlanId is required." });

            var planExists = await _db.WorkoutPlans.AsNoTracking()
                .AnyAsync(p => p.Id == dto.WorkoutPlanId && !p.IsDeleted && p.IsActive, cancellationToken)
                .ConfigureAwait(false);
            if (!planExists)
                return BadRequest(new { message = "Workout plan was not found or is inactive." });

            var sets = dto.Sets?.Where(s => s.ExerciseId > 0 && s.SetNumber > 0 && s.RepsDone >= 0).ToList()
                       ?? new List<MeWorkoutSetEntryDto>();
            if (sets.Count == 0)
                return BadRequest(new { message = "Log at least one set (exercise, set #, reps)." });

            var session = new WorkoutSession
            {
                UserId = userId.Value,
                WorkoutPlanId = dto.WorkoutPlanId,
                SessionDate = DateTime.UtcNow,
                IsCompleted = true,
                DurationMinutes = dto.DurationMinutes,
                Notes = null
            };

            await _db.WorkoutSessions.AddAsync(session, cancellationToken).ConfigureAwait(false);
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            foreach (var s in sets)
            {
                await _db.WorkoutLogs.AddAsync(new WorkoutLog
                {
                    WorkoutSessionId = session.Id,
                    ExerciseId = s.ExerciseId,
                    SetNumber = s.SetNumber,
                    RepsDone = s.RepsDone,
                    WeightUsed = s.WeightUsed,
                    Notes = null,
                    CreatedDate = DateTime.UtcNow
                }, cancellationToken).ConfigureAwait(false);
            }

            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            return Ok(new MeWorkoutSessionCompletedDto
            {
                SessionId = session.Id,
                SetsLogged = sets.Count
            });
        }

        /// <summary>Completed workout sessions for this member (latest first).</summary>
        [HttpGet("workout-sessions")]
        public async Task<ActionResult<IReadOnlyList<MeWorkoutSessionSummaryDto>>> GetWorkoutSessions(
            [FromQuery] int take = 40,
            CancellationToken cancellationToken = default)
        {
            var userId = ResolveUserIdFromClaims();
            if (userId == null) return Unauthorized();

            if (take <= 0) take = 40;
            if (take > 200) take = 200;

            var sessions = await _db.WorkoutSessions.AsNoTracking()
                .Where(ws => ws.UserId == userId && !ws.IsDeleted && ws.IsCompleted)
                .OrderByDescending(ws => ws.SessionDate)
                .Take(take)
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);

            if (sessions.Count == 0)
                return Ok(Array.Empty<MeWorkoutSessionSummaryDto>());

            var planIds = sessions.Where(s => s.WorkoutPlanId.HasValue).Select(s => s.WorkoutPlanId!.Value).Distinct().ToList();
            var planNames = planIds.Count == 0
                ? new Dictionary<int, string>()
                : await _db.WorkoutPlans.AsNoTracking()
                    .Where(p => planIds.Contains(p.Id))
                    .ToDictionaryAsync(p => p.Id, p => p.Name, cancellationToken)
                    .ConfigureAwait(false);

            var sessionIds = sessions.Select(s => s.Id).ToList();
            var setCounts = await _db.WorkoutLogs.AsNoTracking()
                .Where(wl => sessionIds.Contains(wl.WorkoutSessionId))
                .GroupBy(wl => wl.WorkoutSessionId)
                .Select(g => new { SessionId = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);
            var countMap = setCounts.ToDictionary(x => x.SessionId, x => x.Count);

            var result = sessions.Select(ws => new MeWorkoutSessionSummaryDto
            {
                SessionId = ws.Id,
                WorkoutPlanId = ws.WorkoutPlanId,
                PlanName = ws.WorkoutPlanId.HasValue && planNames.TryGetValue(ws.WorkoutPlanId.Value, out var n) ? n : string.Empty,
                SessionDateUtc = ws.SessionDate,
                DurationMinutes = ws.DurationMinutes,
                SetsLogged = countMap.TryGetValue(ws.Id, out var c) ? c : 0
            }).ToList();

            return Ok(result);
        }

        /// <summary>ISO weekday number Monday = 1 … Sunday = 7 (matches typical <c>WorkoutPlanDay.DayNumber</c>).</summary>
        private static int IsoWeekdayNumber(DayOfWeek day) =>
            day == DayOfWeek.Sunday ? 7 : (int)day;

        private static List<MeWorkoutExerciseLineDto> MapMeExerciseLines(
            IEnumerable<WorkoutPlanExercise> lineEntities,
            Dictionary<int, (DateTime SessionDate, decimal? WeightUsed, int RepsDone)> lastByExercise)
        {
            return lineEntities.Select(wpe =>
            {
                DateTime? lastDate = null;
                decimal? lastWeight = null;
                int? lastReps = null;
                if (lastByExercise.TryGetValue(wpe.ExerciseId, out var last))
                {
                    lastDate = last.SessionDate;
                    lastWeight = last.WeightUsed;
                    lastReps = last.RepsDone;
                }

                return new MeWorkoutExerciseLineDto
                {
                    PlanExerciseId = wpe.Id,
                    ExerciseId = wpe.ExerciseId,
                    ExerciseName = wpe.Exercise.Name,
                    BodyPartName = wpe.Exercise.BodyPart?.Name,
                    Order = wpe.Order,
                    TargetSets = wpe.Sets,
                    TargetReps = wpe.Reps,
                    RestSeconds = wpe.RestBetweenSets,
                    SuggestedWeight = wpe.Weight,
                    LastSessionDateUtc = lastDate,
                    LastWeightUsed = lastWeight,
                    LastRepsDone = lastReps
                };
            }).ToList();
        }

        private static DayOfWeek LocalDayOfWeekFromUtcOffset(int? utcOffsetMinutes) =>
            DateTime.UtcNow.AddMinutes(utcOffsetMinutes ?? 0).DayOfWeek;

        private async Task<Dictionary<int, (DateTime SessionDate, decimal? WeightUsed, int RepsDone)>> GetLastLogByExerciseAsync(
            int userId,
            IReadOnlyList<int> exerciseIds)
        {
            if (exerciseIds.Count == 0)
                return new Dictionary<int, (DateTime SessionDate, decimal? WeightUsed, int RepsDone)>();

            var rows = await (
                from wl in _db.WorkoutLogs.AsNoTracking()
                join ws in _db.WorkoutSessions.AsNoTracking() on wl.WorkoutSessionId equals ws.Id
                where exerciseIds.Contains(wl.ExerciseId) && ws.UserId == userId && !ws.IsDeleted
                select new { wl.ExerciseId, ws.SessionDate, wl.WeightUsed, wl.RepsDone, wl.Id }
            ).ToListAsync().ConfigureAwait(false);

            return rows
                .GroupBy(x => x.ExerciseId)
                .ToDictionary(
                    g => g.Key,
                    g =>
                    {
                        var best = g.OrderByDescending(x => x.SessionDate).ThenByDescending(x => x.Id).First();
                        return (best.SessionDate, best.WeightUsed, best.RepsDone);
                    });
        }

        private int? ResolveUserIdFromClaims()
        {
            // Access token: sub = AuthUser.Id; profile row is JwtClaimTypes.UserId (see JwtTokenService + Program.cs NameClaimType).
            // Using NameIdentifier/sub here loaded Users.Id == auth id and returned the wrong member (e.g. after phone login).
            var profileClaim = User.FindFirst(JwtClaimTypes.UserId)?.Value;
            if (!string.IsNullOrWhiteSpace(profileClaim)
                && int.TryParse(profileClaim.Trim(), out var profileId)
                && profileId > 0)
                return profileId;

            var legacy = User.FindFirst("uid")?.Value ?? User.FindFirst("user_id")?.Value;
            if (int.TryParse(legacy, out var id) && id > 0) return id;
            return null;
        }

        private async Task<MeMembershipDto?> GetActiveMembershipAsync(int userId)
        {
            var now = DateTime.UtcNow;
            var membership = await _db.UserMemberships.AsNoTracking()
                .Where(m => m.UserId == userId && !m.IsDeleted)
                .OrderByDescending(m => m.EndDate)
                .FirstOrDefaultAsync();

            if (membership == null) return null;

            var plan = await _db.MembershipPlans.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == membership.PlanId);

            var daysRemaining = (membership.EndDate.Date - now.Date).Days;
            return new MeMembershipDto
            {
                Id = membership.Id,
                PlanId = membership.PlanId,
                PlanName = plan?.PlanName ?? "Membership",
                StartDate = membership.StartDate,
                EndDate = membership.EndDate,
                Status = membership.Status.ToString(),
                DaysRemaining = daysRemaining,
                IsExpiringSoon = daysRemaining is >= 0 and <= 7,
                Price = plan?.Price,
                DurationDays = plan?.DurationDays
            };
        }

        private async Task<MeAttendanceSummaryDto> BuildAttendanceSummaryAsync(int userId)
        {
            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var startOfWeek = now.Date.AddDays(-(int)now.DayOfWeek);
            var thirtyDaysAgo = now.Date.AddDays(-29);

            var rows = await _db.AttendanceLogs.AsNoTracking()
                .Where(a => a.UserId == userId && !a.IsDeleted && a.AttendanceDate >= thirtyDaysAgo)
                .Select(a => a.AttendanceDate)
                .ToListAsync();

            var visitedSet = rows.Select(d => d.Date).ToHashSet();

            var monthCount = rows.Count(d => d.Date >= startOfMonth.Date);
            var weekCount = rows.Count(d => d.Date >= startOfWeek);

            var streak = 0;
            for (int i = 0; i < 90; i++)
            {
                var day = now.Date.AddDays(-i);
                if (visitedSet.Contains(day)) streak++;
                else break;
            }

            DateTime? lastVisit = null;
            if (rows.Count > 0)
                lastVisit = rows.Max();

            var last30 = Enumerable.Range(0, 30)
                .Select(i => now.Date.AddDays(-i))
                .OrderBy(d => d)
                .Select(d => new MeAttendanceDayDto
                {
                    Date = d,
                    Visited = visitedSet.Contains(d)
                })
                .ToList();

            return new MeAttendanceSummaryDto
            {
                TotalThisMonth = monthCount,
                TotalThisWeek = weekCount,
                CurrentStreakDays = streak,
                LastVisitUtc = lastVisit,
                Last30Days = last30
            };
        }

        private async Task<MeBodyMetricSummaryDto?> GetLatestBodyMetricAsync(int userId)
        {
            var row = await _db.BodyMetricsLogs.AsNoTracking()
                .Where(b => b.UserId == userId && !b.IsDeleted)
                .OrderByDescending(b => b.MeasurementDate)
                .FirstOrDefaultAsync();

            if (row == null) return null;

            decimal? bmi = null;
            if (row.WeightKg > 0 && row.HeightCm is > 0)
            {
                var meters = row.HeightCm.Value / 100m;
                bmi = Math.Round(row.WeightKg / (meters * meters), 1);
            }

            return new MeBodyMetricSummaryDto
            {
                LoggedAt = row.MeasurementDate,
                Weight = row.WeightKg,
                Height = row.HeightCm,
                BodyFatPercent = row.BodyFatPct,
                MuscleMass = row.MuscleMassKg,
                Bmi = bmi
            };
        }

        private async Task<IReadOnlyList<MeUpcomingScheduleDto>> GetUpcomingScheduleAsync(int userId)
        {
            var rows = await _db.UserSchedules.AsNoTracking()
                .Where(s => s.UserId == userId && s.IsActive && !s.IsDeleted)
                .Take(8)
                .ToListAsync();

            if (rows.Count == 0) return Array.Empty<MeUpcomingScheduleDto>();

            var trainerIds = rows.Where(r => r.TrainerId.HasValue).Select(r => r.TrainerId!.Value).Distinct().ToList();
            var planIds = rows.Select(r => r.WorkoutPlanId).Distinct().ToList();

            var trainerMap = trainerIds.Count == 0
                ? new Dictionary<int, string>()
                : await _db.Trainers.AsNoTracking()
                    .Where(t => trainerIds.Contains(t.Id))
                    .Join(_db.Users.AsNoTracking(), t => t.UserId, u => u.Id, (t, u) => new { t.Id, Name = u.FirstName + " " + u.LastName })
                    .ToDictionaryAsync(x => x.Id, x => x.Name.Trim());

            var planMap = await _db.WorkoutPlans.AsNoTracking()
                .Where(p => planIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.Name);

            return rows.Select(s => new MeUpcomingScheduleDto
            {
                Id = s.Id,
                Title = planMap.TryGetValue(s.WorkoutPlanId, out var planName) ? planName : "Workout",
                DayOfWeek = s.DayOfWeek.ToString(),
                StartTime = s.StartTime.ToString(@"hh\:mm"),
                EndTime = s.EndTime.ToString(@"hh\:mm"),
                TrainerName = s.TrainerId.HasValue && trainerMap.TryGetValue(s.TrainerId.Value, out var name) ? name : null
            }).ToList();
        }

        private async Task<IReadOnlyList<MeNotificationDto>> GetRecentNotificationsAsync(int userId)
        {
            var rows = await _db.Notifications.AsNoTracking()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedDate)
                .Take(10)
                .ToListAsync();

            return rows.Select(MapNotification).ToList();
        }

        private static MeProfileDto MapProfile(User user, string? email)
        {
            return new MeProfileDto
            {
                UserId = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                FullName = $"{user.FirstName} {user.LastName}".Trim(),
                Email = email ?? string.Empty,
                Phone = user.Phone,
                Gender = user.Gender,
                DateOfBirth = user.DateOfBirth == default ? null : user.DateOfBirth,
                ProfilePictureUrl = user.ProfilePictureUrl,
                RegistrationDate = user.RegistrationDate,
                PreferredGymTime = user.PreferredGymTime
            };
        }

        private static MeBodyMetricLogDto MapMetricLog(BodyMetricsLog row)
        {
            decimal? bmi = null;
            if (row.WeightKg > 0 && row.HeightCm is > 0)
            {
                var meters = row.HeightCm.Value / 100m;
                bmi = Math.Round(row.WeightKg / (meters * meters), 1);
            }

            return new MeBodyMetricLogDto
            {
                Id = row.Id,
                LoggedAt = row.MeasurementDate,
                Weight = row.WeightKg,
                Height = row.HeightCm,
                BodyFatPercent = row.BodyFatPct,
                MuscleMass = row.MuscleMassKg,
                Bmi = bmi,
                Notes = row.Notes
            };
        }

        private static MeNotificationDto MapNotification(Notification n)
        {
            return new MeNotificationDto
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Message,
                CreatedAt = n.CreatedDate,
                IsRead = n.IsRead,
                Type = n.NotificationType
            };
        }
    }
}
