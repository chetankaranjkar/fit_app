import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/me_models.dart';

/// Caches today's plan template per `workoutPlanId` for offline session start.
class WorkoutTemplateCache {
  WorkoutTemplateCache._();
  static final WorkoutTemplateCache instance = WorkoutTemplateCache._();

  static const _prefix = 'pulsefit_workout_template_';

  Future<void> save(int planId, MeWorkoutSessionTemplate template) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      '$_prefix$planId',
      jsonEncode({
        'cachedAt': DateTime.now().toUtc().toIso8601String(),
        'plan': {
          'id': template.plan.id,
          'planName': template.plan.planName,
          'workoutType': template.plan.workoutType,
          'difficultyLevel': template.plan.difficultyLevel,
          'durationMinutes': template.plan.durationMinutes,
          'description': template.plan.description,
          'exerciseCount': template.plan.exerciseCount,
        },
        'exercises': template.exercises.map((e) => {
              'planExerciseId': e.planExerciseId,
              'exerciseId': e.exerciseId,
              'exerciseName': e.exerciseName,
              'bodyPartName': e.bodyPartName,
              'order': e.order,
              'targetSets': e.targetSets,
              'targetReps': e.targetReps,
              'restSeconds': e.restSeconds,
              'suggestedWeight': e.suggestedWeight,
              'lastSessionDateUtc': e.lastSessionDateUtc?.toIso8601String(),
              'lastWeightUsed': e.lastWeightUsed,
              'lastRepsDone': e.lastRepsDone,
            }).toList(),
        'isRestDay': template.isRestDay,
      }),
    );
  }

  Future<MeWorkoutSessionTemplate?> load(int planId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_prefix$planId');
    if (raw == null || raw.isEmpty) return null;
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      final planMap = (json['plan'] as Map?)?.cast<String, dynamic>() ?? {};
      final exercises = (json['exercises'] as List? ?? [])
          .whereType<Map>()
          .map((e) => MeWorkoutExerciseLine.fromJson(e.cast<String, dynamic>()))
          .toList();
      return MeWorkoutSessionTemplate(
        plan: MeWorkoutPlanSummary.fromJson(planMap),
        exercises: exercises,
        isRestDay: json['isRestDay'] as bool? ?? false,
      );
    } catch (_) {
      return null;
    }
  }
}
