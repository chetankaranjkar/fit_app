import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_exception.dart';
import '../../models/me_models.dart';
import '../../providers/workout_tracking_providers.dart';
import '../../services/workout_tracking_repository.dart';

/// Starts or resumes a live workout, then navigates to `/workouts/live`.
Future<void> launchLiveWorkoutSession(
  BuildContext context,
  WidgetRef ref, {
  required MeWorkoutPlanSummary plan,
}) async {
  HapticFeedback.mediumImpact();
  final repo = WorkoutTrackingRepository.instance;
  try {
    final memberId = await ref.read(memberIdProvider.future);
    final session = await repo.resolveOrStart(
      memberId: memberId,
      workoutPlanId: plan.id,
    );
    ref.invalidate(activeWorkoutProvider);
    ref.invalidate(workoutTrackingDashboardProvider);
    if (!context.mounted) return;
    context.push('/workouts/live', extra: session);
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
