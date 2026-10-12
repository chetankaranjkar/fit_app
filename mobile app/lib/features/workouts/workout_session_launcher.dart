import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_exception.dart';
import '../../models/me_models.dart';
import '../../providers/workout_tracking_providers.dart';
import '../../services/workout_tracking_repository.dart';
import 'logic/today_workout_gate.dart';

/// Starts or resumes a live workout, then navigates to `/workouts/live`.
Future<void> launchLiveWorkoutSession(
  BuildContext context,
  WidgetRef ref, {
  required MeWorkoutPlanSummary plan,
  MeWorkoutSessionTemplate? template,
  int warmupsCompleted = 0,
  bool startAnother = false,
}) async {
  HapticFeedback.mediumImpact();
  final repo = WorkoutTrackingRepository.instance;
  try {
    final memberId = await ref.read(memberIdProvider.future);
    final decision = await repo.resolveToday(
      memberId: memberId,
      workoutPlanId: plan.id,
      startAnother: startAnother,
    );
    if (!context.mounted) return;
    if (!startAnother &&
        (decision.action == TodayWorkoutAction.viewCompleted ||
            decision.action == TodayWorkoutAction.syncBeforeAnother)) {
      context.push('/workouts/${plan.id}', extra: plan);
      return;
    }
    if (decision.action == TodayWorkoutAction.otherPlanInProgress) {
      throw const ApiException(
        'Another workout is still in progress. Finish that session before logging this plan.',
      );
    }
    if (decision.action == TodayWorkoutAction.syncBeforeAnother) {
      throw const ApiException('Sync the saved workout before starting another session.');
    }
    final session = decision.action == TodayWorkoutAction.resume && decision.session != null
        ? decision.session!
        : await repo.resolveOrStart(
            memberId: memberId,
            workoutPlanId: plan.id,
            startAnother: startAnother,
          );
    ref.invalidate(activeWorkoutProvider);
    ref.invalidate(workoutTrackingDashboardProvider);
    if (!context.mounted) return;
    context.push('/workouts/live', extra: {
      'session': session,
      'template': template,
      'plan': plan,
      'warmupsCompleted': warmupsCompleted,
    });
  } on ApiException catch (e) {
    if (!context.mounted) return;
    await showCupertinoDialog<void>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Workout'),
        content: Text(e.message),
        actions: [
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}
