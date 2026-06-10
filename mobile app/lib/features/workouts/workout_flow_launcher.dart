import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/me_models.dart';
import '../../providers/me_providers.dart';

/// Opens workout overview, then warmup → live workout → stretch → summary.
Future<void> launchFullWorkoutFlow(
  BuildContext context,
  WidgetRef ref, {
  required MeWorkoutPlanSummary plan,
}) async {
  HapticFeedback.mediumImpact();
  final tpl = await ref.read(workoutSessionTemplateProvider(plan.id).future);
  if (!context.mounted) return;

  context.push(
    '/workouts/${plan.id}/overview',
    extra: {'plan': plan, 'template': tpl},
  );
}
