import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../providers/workout_tracking_providers.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';
import '../../../widgets/skeleton_shimmer.dart';

/// Streak, weekly volume, and resume/start CTA from `/api/workout/dashboard`.
class WorkoutDashboardCard extends ConsumerWidget {
  const WorkoutDashboardCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dash = ref.watch(workoutTrackingDashboardProvider);

    return dash.when(
      loading: () => const SkeletonBlock(height: 120),
      error: (_, __) => const SizedBox.shrink(),
      data: (d) {
        final last = d.lastWorkoutDateUtc != null
            ? DateFormat.MMMd().format(d.lastWorkoutDateUtc!.toLocal())
            : '—';
        final active = d.activeSession;

        return GlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Training stats', style: FitnessText.title(context)),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  _StatChip(
                    label: 'Streak',
                    value: '${d.currentStreakDays}d',
                    icon: CupertinoIcons.flame_fill,
                    color: AppColors.accent,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _StatChip(
                    label: 'This week',
                    value: '${d.workoutsThisWeek}',
                    icon: CupertinoIcons.calendar,
                    color: AppColors.neonCyan,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _StatChip(
                    label: 'Avg done',
                    value: '${d.averageCompletionPercent.round()}%',
                    icon: CupertinoIcons.chart_bar_alt_fill,
                    color: AppColors.neonPurple,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Last session · $last · ${d.totalWorkouts} total',
                style: FitnessText.label(context),
              ),
              const SizedBox(height: AppSpacing.md),
              CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: () {
                  if (active != null) {
                    context.push('/workouts/live', extra: active);
                  } else {
                    context.go('/workouts');
                  }
                },
                child: Container(
                  width: double.infinity,
                  height: 44,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: active != null ? AppColors.neonGradient : null,
                    color: active == null ? AppColors.neonPurple.withValues(alpha: 0.25) : null,
                    border: active == null
                        ? Border.all(color: AppColors.neonPurple.withValues(alpha: 0.45))
                        : null,
                  ),
                  child: Center(
                    child: Text(
                      active != null
                          ? 'Resume workout (${active.completionPercent.round()}%)'
                          : 'Open workouts',
                      style: FitnessText.chip(context).copyWith(
                        color: CupertinoColors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: color.withValues(alpha: 0.12),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(height: 4),
            Text(value, style: FitnessText.metric(context, size: 18)),
            Text(label, style: FitnessText.label(context)),
          ],
        ),
      ),
    );
  }
}
