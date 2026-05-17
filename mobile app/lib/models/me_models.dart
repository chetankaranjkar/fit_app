// Models matching `/api/me/*` endpoints.

class MeProfile {
  final int userId;
  final String firstName;
  final String lastName;
  final String fullName;
  final String email;
  final String? phone;
  final String? gender;
  final DateTime? dateOfBirth;
  final String? profilePictureUrl;
  final DateTime registrationDate;
  final String? preferredGymTime;

  const MeProfile({
    required this.userId,
    required this.firstName,
    required this.lastName,
    required this.fullName,
    required this.email,
    required this.registrationDate,
    this.phone,
    this.gender,
    this.dateOfBirth,
    this.profilePictureUrl,
    this.preferredGymTime,
  });

  factory MeProfile.fromJson(Map<String, dynamic> json) {
    return MeProfile(
      userId: _int(json['userId']) ?? 0,
      firstName: json['firstName']?.toString() ?? '',
      lastName: json['lastName']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString(),
      gender: json['gender']?.toString(),
      dateOfBirth: _dt(json['dateOfBirth']),
      profilePictureUrl: json['profilePictureUrl']?.toString(),
      registrationDate: _dt(json['registrationDate']) ?? DateTime.now(),
      preferredGymTime: json['preferredGymTime']?.toString(),
    );
  }

  String get initials {
    final f = firstName.isNotEmpty ? firstName[0] : '';
    final l = lastName.isNotEmpty ? lastName[0] : '';
    final result = (f + l).trim();
    return result.isEmpty ? 'U' : result.toUpperCase();
  }
}

class MeMembership {
  final int id;
  final int planId;
  final String planName;
  final DateTime startDate;
  final DateTime endDate;
  final String status;
  final int daysRemaining;
  final bool isExpiringSoon;
  final num? price;
  final int? durationDays;

  const MeMembership({
    required this.id,
    required this.planId,
    required this.planName,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.daysRemaining,
    required this.isExpiringSoon,
    this.price,
    this.durationDays,
  });

  factory MeMembership.fromJson(Map<String, dynamic> json) {
    return MeMembership(
      id: _int(json['id']) ?? 0,
      planId: _int(json['planId']) ?? 0,
      planName: json['planName']?.toString() ?? 'Membership',
      startDate: _dt(json['startDate']) ?? DateTime.now(),
      endDate: _dt(json['endDate']) ?? DateTime.now(),
      status: json['status']?.toString() ?? 'Active',
      daysRemaining: _int(json['daysRemaining']) ?? 0,
      isExpiringSoon: json['isExpiringSoon'] == true,
      price: json['price'] is num ? json['price'] as num : null,
      durationDays: _int(json['durationDays']),
    );
  }

  bool get isActive => status.toLowerCase() == 'active' && daysRemaining >= 0;
}

class MeAttendanceDay {
  final DateTime date;
  final bool visited;
  const MeAttendanceDay({required this.date, required this.visited});

  factory MeAttendanceDay.fromJson(Map<String, dynamic> json) => MeAttendanceDay(
        date: _dt(json['date']) ?? DateTime.now(),
        visited: json['visited'] == true,
      );
}

class MeAttendanceSummary {
  final int totalThisMonth;
  final int totalThisWeek;
  final int currentStreakDays;
  final DateTime? lastVisitUtc;
  final List<MeAttendanceDay> last30Days;

  const MeAttendanceSummary({
    required this.totalThisMonth,
    required this.totalThisWeek,
    required this.currentStreakDays,
    required this.last30Days,
    this.lastVisitUtc,
  });

  factory MeAttendanceSummary.fromJson(Map<String, dynamic> json) {
    final list = (json['last30Days'] as List? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(MeAttendanceDay.fromJson)
        .toList();
    return MeAttendanceSummary(
      totalThisMonth: _int(json['totalThisMonth']) ?? 0,
      totalThisWeek: _int(json['totalThisWeek']) ?? 0,
      currentStreakDays: _int(json['currentStreakDays']) ?? 0,
      lastVisitUtc: _dt(json['lastVisitUtc']),
      last30Days: list,
    );
  }
}

class MeBodyMetricSummary {
  final DateTime loggedAt;
  final num? weight;
  final num? height;
  final num? bodyFatPercent;
  final num? muscleMass;
  final num? bmi;

  const MeBodyMetricSummary({
    required this.loggedAt,
    this.weight,
    this.height,
    this.bodyFatPercent,
    this.muscleMass,
    this.bmi,
  });

  factory MeBodyMetricSummary.fromJson(Map<String, dynamic> json) => MeBodyMetricSummary(
        loggedAt: _dt(json['loggedAt']) ?? DateTime.now(),
        weight: json['weight'] is num ? json['weight'] as num : null,
        height: json['height'] is num ? json['height'] as num : null,
        bodyFatPercent: json['bodyFatPercent'] is num ? json['bodyFatPercent'] as num : null,
        muscleMass: json['muscleMass'] is num ? json['muscleMass'] as num : null,
        bmi: json['bmi'] is num ? json['bmi'] as num : null,
      );
}

class MeBodyMetricLog {
  final int id;
  final DateTime loggedAt;
  final num? weight;
  final num? height;
  final num? bodyFatPercent;
  final num? muscleMass;
  final num? bmi;
  final String? notes;

  const MeBodyMetricLog({
    required this.id,
    required this.loggedAt,
    this.weight,
    this.height,
    this.bodyFatPercent,
    this.muscleMass,
    this.bmi,
    this.notes,
  });

  factory MeBodyMetricLog.fromJson(Map<String, dynamic> json) => MeBodyMetricLog(
        id: _int(json['id']) ?? 0,
        loggedAt: _dt(json['loggedAt']) ?? DateTime.now(),
        weight: json['weight'] is num ? json['weight'] as num : null,
        height: json['height'] is num ? json['height'] as num : null,
        bodyFatPercent: json['bodyFatPercent'] is num ? json['bodyFatPercent'] as num : null,
        muscleMass: json['muscleMass'] is num ? json['muscleMass'] as num : null,
        bmi: json['bmi'] is num ? json['bmi'] as num : null,
        notes: json['notes']?.toString(),
      );
}

class MeUpcomingSchedule {
  final int id;
  final String title;
  final String? dayOfWeek;
  final String? startTime;
  final String? endTime;
  final String? trainerName;

  const MeUpcomingSchedule({
    required this.id,
    required this.title,
    this.dayOfWeek,
    this.startTime,
    this.endTime,
    this.trainerName,
  });

  factory MeUpcomingSchedule.fromJson(Map<String, dynamic> json) => MeUpcomingSchedule(
        id: _int(json['id']) ?? 0,
        title: json['title']?.toString() ?? 'Workout',
        dayOfWeek: json['dayOfWeek']?.toString(),
        startTime: json['startTime']?.toString(),
        endTime: json['endTime']?.toString(),
        trainerName: json['trainerName']?.toString(),
      );
}

class MeNotification {
  final int id;
  final String title;
  final String message;
  final DateTime createdAt;
  final bool isRead;
  final String? type;

  const MeNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.createdAt,
    required this.isRead,
    this.type,
  });

  factory MeNotification.fromJson(Map<String, dynamic> json) => MeNotification(
        id: _int(json['id']) ?? 0,
        title: json['title']?.toString() ?? '',
        message: json['message']?.toString() ?? '',
        createdAt: _dt(json['createdAt']) ?? DateTime.now(),
        isRead: json['isRead'] == true,
        type: json['type']?.toString(),
      );
}

class MeWorkoutPlanSummary {
  final int id;
  final String planName;
  final String workoutType;
  final String? difficultyLevel;
  final int? durationMinutes;
  final String? description;
  final int exerciseCount;

  const MeWorkoutPlanSummary({
    required this.id,
    required this.planName,
    required this.workoutType,
    required this.exerciseCount,
    this.difficultyLevel,
    this.durationMinutes,
    this.description,
  });

  factory MeWorkoutPlanSummary.fromJson(Map<String, dynamic> json) => MeWorkoutPlanSummary(
        id: _int(json['id']) ?? 0,
        planName: json['planName']?.toString() ?? '',
        workoutType: json['workoutType']?.toString() ?? '',
        difficultyLevel: json['difficultyLevel']?.toString(),
        durationMinutes: _int(json['durationMinutes']),
        description: json['description']?.toString(),
        exerciseCount: _int(json['exerciseCount']) ?? 0,
      );
}

class MeWorkoutExerciseLine {
  final int planExerciseId;
  final int exerciseId;
  final String exerciseName;
  final String? bodyPartName;
  final int order;
  final int targetSets;
  final int targetReps;
  final int restSeconds;
  final double? suggestedWeight;
  final DateTime? lastSessionDateUtc;
  final double? lastWeightUsed;
  final int? lastRepsDone;

  const MeWorkoutExerciseLine({
    required this.planExerciseId,
    required this.exerciseId,
    required this.exerciseName,
    required this.order,
    required this.targetSets,
    required this.targetReps,
    required this.restSeconds,
    this.bodyPartName,
    this.suggestedWeight,
    this.lastSessionDateUtc,
    this.lastWeightUsed,
    this.lastRepsDone,
  });

  factory MeWorkoutExerciseLine.fromJson(Map<String, dynamic> json) => MeWorkoutExerciseLine(
        planExerciseId: _int(json['planExerciseId']) ?? 0,
        exerciseId: _int(json['exerciseId']) ?? 0,
        exerciseName: json['exerciseName']?.toString() ?? '',
        bodyPartName: json['bodyPartName']?.toString(),
        order: _int(json['order']) ?? 0,
        targetSets: _int(json['targetSets']) ?? 0,
        targetReps: _int(json['targetReps']) ?? 0,
        restSeconds: _int(json['restSeconds']) ?? 0,
        suggestedWeight: _double(json['suggestedWeight']),
        lastSessionDateUtc: _dt(json['lastSessionDateUtc']),
        lastWeightUsed: _double(json['lastWeightUsed']),
        lastRepsDone: _int(json['lastRepsDone']),
      );
}

class MeWorkoutSessionTemplate {
  final MeWorkoutPlanSummary plan;
  final List<MeWorkoutExerciseLine> exercises;
  final bool filteredToToday;
  final bool isRestDay;
  final String? todayDayName;
  final bool isScheduledToday;

  const MeWorkoutSessionTemplate({
    required this.plan,
    required this.exercises,
    this.filteredToToday = false,
    this.isRestDay = false,
    this.todayDayName,
    this.isScheduledToday = true,
  });

  factory MeWorkoutSessionTemplate.fromJson(Map<String, dynamic> json) => MeWorkoutSessionTemplate(
        plan: MeWorkoutPlanSummary.fromJson(
          (json['plan'] as Map?)?.cast<String, dynamic>() ?? {},
        ),
        exercises: (json['exercises'] as List? ?? [])
            .whereType<Map>()
            .map((e) => MeWorkoutExerciseLine.fromJson(e.cast<String, dynamic>()))
            .toList(),
        filteredToToday: json['filteredToToday'] as bool? ?? false,
        isRestDay: json['isRestDay'] as bool? ?? false,
        todayDayName: json['todayDayName'] as String?,
        isScheduledToday: json['isScheduledToday'] as bool? ?? true,
      );
}

class MeWorkoutSetEntry {
  final int exerciseId;
  final int setNumber;
  final int repsDone;
  final double? weightUsed;

  const MeWorkoutSetEntry({
    required this.exerciseId,
    required this.setNumber,
    required this.repsDone,
    this.weightUsed,
  });

  Map<String, dynamic> toJson() => {
        'exerciseId': exerciseId,
        'setNumber': setNumber,
        'repsDone': repsDone,
        if (weightUsed != null) 'weightUsed': weightUsed,
      };
}

class MeWorkoutSessionCompleted {
  final int sessionId;
  final int setsLogged;

  const MeWorkoutSessionCompleted({
    required this.sessionId,
    required this.setsLogged,
  });

  factory MeWorkoutSessionCompleted.fromJson(Map<String, dynamic> json) => MeWorkoutSessionCompleted(
        sessionId: _int(json['sessionId']) ?? 0,
        setsLogged: _int(json['setsLogged']) ?? 0,
      );
}

class MeDashboard {
  final MeProfile profile;
  final MeMembership? membership;
  final MeAttendanceSummary attendance;
  final MeBodyMetricSummary? latestBodyMetric;
  final List<MeUpcomingSchedule> upcomingSchedule;
  final List<MeNotification> recentNotifications;

  const MeDashboard({
    required this.profile,
    required this.attendance,
    required this.upcomingSchedule,
    required this.recentNotifications,
    this.membership,
    this.latestBodyMetric,
  });

  factory MeDashboard.fromJson(Map<String, dynamic> json) {
    final membership = json['membership'];
    final latestMetric = json['latestBodyMetric'];

    return MeDashboard(
      profile: MeProfile.fromJson((json['profile'] as Map?)?.cast<String, dynamic>() ?? {}),
      membership: membership is Map
          ? MeMembership.fromJson(membership.cast<String, dynamic>())
          : null,
      attendance: MeAttendanceSummary.fromJson(
          (json['attendance'] as Map?)?.cast<String, dynamic>() ?? {}),
      latestBodyMetric: latestMetric is Map
          ? MeBodyMetricSummary.fromJson(latestMetric.cast<String, dynamic>())
          : null,
      upcomingSchedule: (json['upcomingSchedule'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(MeUpcomingSchedule.fromJson)
          .toList(),
      recentNotifications: (json['recentNotifications'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(MeNotification.fromJson)
          .toList(),
    );
  }
}

int? _int(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v);
  return null;
}

double? _double(dynamic v) {
  if (v == null) return null;
  if (v is double) return v;
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v);
  return null;
}

DateTime? _dt(dynamic v) {
  if (v == null) return null;
  if (v is DateTime) return v;
  if (v is String) return DateTime.tryParse(v);
  return null;
}

class MeDietPlan {
  final int assignmentId;
  final int dietPlanId;
  final String planName;
  final String goalType;
  final int calories;
  final int? proteinGrams;
  final int? carbsGrams;
  final int? fatsGrams;
  final String? description;
  final DateTime startDate;
  final DateTime? endDate;
  final List<MeDietMeal> meals;

  const MeDietPlan({
    required this.assignmentId,
    required this.dietPlanId,
    required this.planName,
    required this.goalType,
    required this.calories,
    required this.startDate,
    required this.meals,
    this.proteinGrams,
    this.carbsGrams,
    this.fatsGrams,
    this.description,
    this.endDate,
  });

  factory MeDietPlan.fromJson(Map<String, dynamic> json) {
    return MeDietPlan(
      assignmentId: _int(json['assignmentId']) ?? 0,
      dietPlanId: _int(json['dietPlanId']) ?? 0,
      planName: json['planName']?.toString() ?? '',
      goalType: json['goalType']?.toString() ?? '',
      calories: _int(json['calories']) ?? 0,
      proteinGrams: _int(json['proteinGrams']),
      carbsGrams: _int(json['carbsGrams']),
      fatsGrams: _int(json['fatsGrams']),
      description: json['description']?.toString(),
      startDate: _dt(json['startDate']) ?? DateTime.now(),
      endDate: _dt(json['endDate']),
      meals: (json['meals'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(MeDietMeal.fromJson)
          .toList(),
    );
  }
}

class MeDietMeal {
  final int id;
  final String mealName;
  final int mealOrder;
  final List<MeDietMealItem> items;

  const MeDietMeal({
    required this.id,
    required this.mealName,
    required this.mealOrder,
    required this.items,
  });

  factory MeDietMeal.fromJson(Map<String, dynamic> json) {
    return MeDietMeal(
      id: _int(json['id']) ?? 0,
      mealName: json['mealName']?.toString() ?? '',
      mealOrder: _int(json['mealOrder']) ?? 0,
      items: (json['items'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(MeDietMealItem.fromJson)
          .toList(),
    );
  }
}

class MeDietMealItem {
  final int id;
  final String foodName;
  final String quantity;
  final int? calories;
  final double? proteinGrams;
  final double? carbsGrams;
  final double? fatsGrams;

  const MeDietMealItem({
    required this.id,
    required this.foodName,
    required this.quantity,
    this.calories,
    this.proteinGrams,
    this.carbsGrams,
    this.fatsGrams,
  });

  factory MeDietMealItem.fromJson(Map<String, dynamic> json) {
    return MeDietMealItem(
      id: _int(json['id']) ?? 0,
      foodName: json['foodName']?.toString() ?? '',
      quantity: json['quantity']?.toString() ?? '',
      calories: _int(json['calories']),
      proteinGrams: _double(json['proteinGrams']),
      carbsGrams: _double(json['carbsGrams']),
      fatsGrams: _double(json['fatsGrams']),
    );
  }
}
