import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';

import '../../../models/me_models.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../workout_derived_metrics.dart';
import 'workout_hero_backdrop.dart';

class WorkoutCommandHero extends StatelessWidget {
  const WorkoutCommandHero({
    super.key,
    required this.profile,
    required this.attendance,
    required this.featuredPlan,
  });

  final MeProfile profile;
  final MeAttendanceSummary attendance;
  final MeWorkoutPlanSummary? featuredPlan;

  @override
  Widget build(BuildContext context) {
    final pct = WorkoutDerivedMetrics.completionPercent(attendance) / 100.0;
    final recovery = WorkoutDerivedMetrics.recoveryScore(attendance);
    final kcal = featuredPlan != null
        ? WorkoutDerivedMetrics.estimatedSessionKcal(featuredPlan!)
        : 0;
    final duration = featuredPlan?.durationMinutes ?? 0;
    final first = profile.firstName.isNotEmpty ? profile.firstName : 'Athlete';

    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: Stack(
        children: [
          const Positioned.fill(child: WorkoutHeroBackdrop()),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF000000).withValues(alpha: 0.1),
                    const Color(0xFF000000).withValues(alpha: 0.55),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.xl, AppSpacing.lg, AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('COMMAND CENTER', style: FitnessText.label(context)),
                          const SizedBox(height: 4),
                          Text(
                            'Hey $first — stay relentless.',
                            style: FitnessText.display(context, size:26),
                          ),
                        ],
                      ),
                    ),
                    CircularPercentIndicator(
                      radius: 44,
                      lineWidth: 7,
                      percent: pct.clamp(0.0, 1.0),
                      animation: true,
                      animateFromLastPercent: true,
                      circularStrokeCap: CircularStrokeCap.round,
                      backgroundColor: CupertinoColors.white.withValues(alpha: 0.08),
                      linearGradient: const LinearGradient(
                        colors: [AppColors.neonCyan, AppColors.neonBlue, AppColors.neonPurple],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      center: Text(
                        '${(pct * 100).round()}%',
                        style: FitnessText.metric(context, size: 16).copyWith(
                          color: CupertinoColors.white,
                        ),
                      ),
                    ).animate().fadeIn(duration: 400.ms).scale(
                          begin: const Offset(0.92, 0.92),
                          curve: Curves.easeOutBack,
                          duration: 500.ms,
                        ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                Row(
                  children: [
                    _MiniStat(
                      icon: CupertinoIcons.flame_fill,
                      label: 'Est. kcal',
                      value: kcal > 0 ? '$kcal' : '—',
                      color: AppColors.accent,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    _MiniStat(
                      icon: CupertinoIcons.timer,
                      label: 'Duration',
                      value: duration > 0 ? '${duration}m' : '—',
                      color: AppColors.neonBlueLite,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    _MiniStat(
                      icon: CupertinoIcons.heart_fill,
                      label: 'Recovery',
                      value: '$recovery',
                      color: AppColors.success,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 350.ms)
        .slideY(begin: 0.06, end: 0, curve: Curves.easeOutCubic, duration: 400.ms);
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.md),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color: CupertinoColors.white.withValues(alpha: 0.06),
          border: Border.all(color: color.withValues(alpha: 0.25), width: 0.6),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.18),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: LinearGradient(
                  colors: [color.withValues(alpha: 0.9), color.withValues(alpha: 0.45)],
                ),
              ),
              child: Icon(icon, size: 18, color: CupertinoColors.white),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label.toUpperCase(), style: FitnessText.label(context)),
                  Text(
                    value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: FitnessText.metric(context, size: 18).copyWith(color: CupertinoColors.white),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
