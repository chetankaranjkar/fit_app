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

/// Progress / transformation photo (`UserBodyImage`) from `/api/me/progress-photos`.
class MeProgressPhoto {
  final int id;
  final int userId;
  final String imageUrl;
  final String imageType;
  final DateTime imageDate;
  final String? notes;
  final double? weightKg;
  final double? bodyFatPercent;
  final String? uploadedByName;

  const MeProgressPhoto({
    required this.id,
    required this.userId,
    required this.imageUrl,
    required this.imageType,
    required this.imageDate,
    this.notes,
    this.weightKg,
    this.bodyFatPercent,
    this.uploadedByName,
  });

  factory MeProgressPhoto.fromJson(Map<String, dynamic> json) {
    return MeProgressPhoto(
      id: _int(json['id']) ?? 0,
      userId: _int(json['userId']) ?? 0,
      imageUrl: json['imageUrl']?.toString() ?? '',
      imageType: json['imageType']?.toString() ?? 'FullBody',
      imageDate: _dt(json['imageDate']) ?? DateTime.now(),
      notes: json['notes']?.toString(),
      weightKg: _double(json['weightKg']),
      bodyFatPercent: _double(json['bodyFatPercent']),
      uploadedByName: json['uploadedByName']?.toString(),
    );
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

  /// Hides server-side dedupe markers from member-facing copy.
  String get displayMessage => stripNotificationMarker(message);

  static String stripNotificationMarker(String raw) {
    final trimmed = raw.trim();
    var result = trimmed.replaceAll(
      RegExp(r'\s*\[mid:\d+\]\[d:\d+\]\s*$', caseSensitive: false),
      '',
    );
    result = result.replaceAll(
      RegExp(r'\s*\[wdr:\d{8}:\d+\]\s*$', caseSensitive: false),
      '',
    );
    return result.trim();
  }

  bool get isMembershipExpiring => type == 'membership_expiring';
  bool get isPaymentDue => type == 'payment_due';
  bool get isWorkoutToday => type == 'workout_today';
}

class MeInvoiceReceipt {
  final int transactionId;
  final String receiptNumber;
  final num amount;
  final DateTime paidAt;
  final String method;
  final String status;

  const MeInvoiceReceipt({
    required this.transactionId,
    required this.receiptNumber,
    required this.amount,
    required this.paidAt,
    required this.method,
    required this.status,
  });

  factory MeInvoiceReceipt.fromJson(Map<String, dynamic> json) => MeInvoiceReceipt(
        transactionId: _int(json['transactionId']) ?? 0,
        receiptNumber: json['receiptNumber']?.toString() ?? '',
        amount: json['amount'] is num ? json['amount'] as num : 0,
        paidAt: _dt(json['paidAt']) ?? DateTime.now(),
        method: json['method']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
      );
}

class MeInvoiceSummary {
  final int membershipPaymentId;
  final String paymentNumber;
  final String? invoiceNumber;
  final int? invoiceId;
  final String planName;
  final num totalAmount;
  final num paidAmount;
  final num pendingAmount;
  final String paymentStatus;
  final DateTime? paymentDate;
  final DateTime? nextDueDate;
  final bool hasPdf;
  final List<MeInvoiceReceipt> receipts;

  const MeInvoiceSummary({
    required this.membershipPaymentId,
    required this.paymentNumber,
    required this.planName,
    required this.totalAmount,
    required this.paidAmount,
    required this.pendingAmount,
    required this.paymentStatus,
    required this.hasPdf,
    required this.receipts,
    this.invoiceNumber,
    this.invoiceId,
    this.paymentDate,
    this.nextDueDate,
  });

  factory MeInvoiceSummary.fromJson(Map<String, dynamic> json) {
    final receipts = (json['receipts'] as List? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(MeInvoiceReceipt.fromJson)
        .toList();
    return MeInvoiceSummary(
      membershipPaymentId: _int(json['membershipPaymentId']) ?? 0,
      paymentNumber: json['paymentNumber']?.toString() ?? '',
      invoiceNumber: json['invoiceNumber']?.toString(),
      invoiceId: _int(json['invoiceId']),
      planName: json['planName']?.toString() ?? 'Membership',
      totalAmount: json['totalAmount'] is num ? json['totalAmount'] as num : 0,
      paidAmount: json['paidAmount'] is num ? json['paidAmount'] as num : 0,
      pendingAmount: json['pendingAmount'] is num ? json['pendingAmount'] as num : 0,
      paymentStatus: json['paymentStatus']?.toString() ?? '',
      paymentDate: _dt(json['paymentDate']),
      nextDueDate: _dt(json['nextDueDate']),
      hasPdf: json['hasPdf'] == true,
      receipts: receipts,
    );
  }

  bool get isPaid => paymentStatus.toLowerCase() == 'paid';
}

class MeBillingAccess {
  final bool accessBlocked;
  final num? pendingAmount;
  final DateTime? nextDueDate;
  final String? message;
  final int? membershipPaymentId;

  const MeBillingAccess({
    required this.accessBlocked,
    this.pendingAmount,
    this.nextDueDate,
    this.message,
    this.membershipPaymentId,
  });

  factory MeBillingAccess.fromJson(Map<String, dynamic> json) {
    return MeBillingAccess(
      accessBlocked: json['accessBlocked'] == true,
      pendingAmount: json['pendingAmount'] is num ? json['pendingAmount'] as num : null,
      nextDueDate: _dt(json['nextDueDate']),
      message: json['message']?.toString(),
      membershipPaymentId: _int(json['membershipPaymentId']),
    );
  }

  bool get hasPendingBalance => (pendingAmount ?? 0) > 0;
}

class MeWorkoutPlanSummary {
  final int id;
  final String planName;
  final String workoutType;
  final String? difficultyLevel;
  final int? durationMinutes;
  final String? description;
  final int exerciseCount;
  final int warmupCount;
  final int stretchCount;
  final int? estimatedDurationSeconds;
  final String? workoutCategoryName;

  const MeWorkoutPlanSummary({
    required this.id,
    required this.planName,
    required this.workoutType,
    required this.exerciseCount,
    this.difficultyLevel,
    this.durationMinutes,
    this.description,
    this.warmupCount = 0,
    this.stretchCount = 0,
    this.estimatedDurationSeconds,
    this.workoutCategoryName,
  });

  factory MeWorkoutPlanSummary.fromJson(Map<String, dynamic> json) => MeWorkoutPlanSummary(
        id: _int(json['id']) ?? 0,
        planName: json['planName']?.toString() ?? '',
        workoutType: json['workoutType']?.toString() ?? '',
        difficultyLevel: json['difficultyLevel']?.toString(),
        durationMinutes: _int(json['durationMinutes']),
        description: json['description']?.toString(),
        exerciseCount: _int(json['exerciseCount']) ?? 0,
        warmupCount: _int(json['warmupCount']) ?? 0,
        stretchCount: _int(json['stretchCount']) ?? 0,
        estimatedDurationSeconds: _int(json['estimatedDurationSeconds']),
        workoutCategoryName: json['workoutCategoryName']?.toString(),
      );
}

class MeWorkoutWarmupLine {
  final int planWarmupId;
  final int warmupId;
  final String name;
  final String? description;
  final String? videoUrl;
  final int durationSeconds;
  final String? bodyPart;
  final int displayOrder;

  const MeWorkoutWarmupLine({
    required this.planWarmupId,
    required this.warmupId,
    required this.name,
    required this.durationSeconds,
    required this.displayOrder,
    this.description,
    this.videoUrl,
    this.bodyPart,
  });

  factory MeWorkoutWarmupLine.fromJson(Map<String, dynamic> json) => MeWorkoutWarmupLine(
        planWarmupId: _int(json['planWarmupId']) ?? 0,
        warmupId: _int(json['warmupId']) ?? 0,
        name: json['name']?.toString() ?? '',
        description: json['description']?.toString(),
        videoUrl: json['videoUrl']?.toString(),
        durationSeconds: _int(json['durationSeconds']) ?? 0,
        bodyPart: json['bodyPart']?.toString(),
        displayOrder: _int(json['displayOrder']) ?? 0,
      );
}

class MeWorkoutStretchLine {
  final int planStretchId;
  final int stretchId;
  final String name;
  final String? description;
  final String? videoUrl;
  final int durationSeconds;
  final String? bodyPart;
  final int displayOrder;

  const MeWorkoutStretchLine({
    required this.planStretchId,
    required this.stretchId,
    required this.name,
    required this.durationSeconds,
    required this.displayOrder,
    this.description,
    this.videoUrl,
    this.bodyPart,
  });

  factory MeWorkoutStretchLine.fromJson(Map<String, dynamic> json) => MeWorkoutStretchLine(
        planStretchId: _int(json['planStretchId']) ?? 0,
        stretchId: _int(json['stretchId']) ?? 0,
        name: json['name']?.toString() ?? '',
        description: json['description']?.toString(),
        videoUrl: json['videoUrl']?.toString(),
        durationSeconds: _int(json['durationSeconds']) ?? 0,
        bodyPart: json['bodyPart']?.toString(),
        displayOrder: _int(json['displayOrder']) ?? 0,
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
  final List<MeWorkoutWarmupLine> warmups;
  final List<MeWorkoutExerciseLine> exercises;
  final List<MeWorkoutStretchLine> stretches;
  final bool filteredToToday;
  final bool isRestDay;
  final String? todayDayName;
  final bool isScheduledToday;
  final int? workoutCategoryId;
  final String? workoutCategoryName;
  final int? estimatedDurationSeconds;
  final int warmupCount;
  final int stretchCount;
  final String templateMode;
  final int? currentProgramWeek;
  final int? currentProgramDay;
  final int? templateWeekCount;
  final int? planVersion;

  const MeWorkoutSessionTemplate({
    required this.plan,
    required this.exercises,
    this.warmups = const [],
    this.stretches = const [],
    this.filteredToToday = false,
    this.isRestDay = false,
    this.todayDayName,
    this.isScheduledToday = true,
    this.workoutCategoryId,
    this.workoutCategoryName,
    this.estimatedDurationSeconds,
    this.warmupCount = 0,
    this.stretchCount = 0,
    this.templateMode = 'LEGACY',
    this.currentProgramWeek,
    this.currentProgramDay,
    this.templateWeekCount,
    this.planVersion,
  });

  factory MeWorkoutSessionTemplate.fromJson(Map<String, dynamic> json) => MeWorkoutSessionTemplate(
        plan: MeWorkoutPlanSummary.fromJson(
          (json['plan'] as Map?)?.cast<String, dynamic>() ?? {},
        ),
        warmups: (json['warmups'] as List? ?? [])
            .whereType<Map>()
            .map((e) => MeWorkoutWarmupLine.fromJson(e.cast<String, dynamic>()))
            .toList(),
        exercises: (json['exercises'] as List? ?? [])
            .whereType<Map>()
            .map((e) => MeWorkoutExerciseLine.fromJson(e.cast<String, dynamic>()))
            .toList(),
        stretches: (json['stretches'] as List? ?? [])
            .whereType<Map>()
            .map((e) => MeWorkoutStretchLine.fromJson(e.cast<String, dynamic>()))
            .toList(),
        filteredToToday: json['filteredToToday'] as bool? ?? false,
        isRestDay: json['isRestDay'] as bool? ?? false,
        todayDayName: json['todayDayName'] as String?,
        isScheduledToday: json['isScheduledToday'] as bool? ?? true,
        workoutCategoryId: _int(json['workoutCategoryId']),
        workoutCategoryName: json['workoutCategoryName']?.toString(),
        estimatedDurationSeconds: _int(json['estimatedDurationSeconds']),
        warmupCount: _int(json['warmupCount']) ?? 0,
        stretchCount: _int(json['stretchCount']) ?? 0,
        templateMode: json['templateMode']?.toString() ?? 'LEGACY',
        currentProgramWeek: _int(json['currentProgramWeek']),
        currentProgramDay: _int(json['currentProgramDay']),
        templateWeekCount: _int(json['templateWeekCount']),
        planVersion: _int(json['planVersion']),
      );
}

/// Summary payload passed between mobility / workout / summary screens.
class WorkoutFlowSummary {
  final int warmupsCompleted;
  final int exercisesCompleted;
  final int stretchesCompleted;
  final int durationSeconds;
  final int? estimatedCalories;

  const WorkoutFlowSummary({
    required this.warmupsCompleted,
    required this.exercisesCompleted,
    required this.stretchesCompleted,
    required this.durationSeconds,
    this.estimatedCalories,
  });
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

/// Past completed sessions from `GET /api/me/workout-sessions`.
class MeWorkoutSessionSummary {
  final int sessionId;
  final int workoutPlanId;
  final String planName;
  final DateTime sessionDateUtc;
  final int? durationMinutes;
  final int setsLogged;

  const MeWorkoutSessionSummary({
    required this.sessionId,
    required this.workoutPlanId,
    required this.planName,
    required this.sessionDateUtc,
    required this.setsLogged,
    this.durationMinutes,
  });

  factory MeWorkoutSessionSummary.fromJson(Map<String, dynamic> json) => MeWorkoutSessionSummary(
        sessionId: _int(json['sessionId']) ?? 0,
        workoutPlanId: _int(json['workoutPlanId']) ?? 0,
        planName: json['planName']?.toString() ?? '',
        sessionDateUtc: _dt(json['sessionDateUtc']) ?? DateTime.now(),
        durationMinutes: _int(json['durationMinutes']),
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
