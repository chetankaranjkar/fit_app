import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../models/me_models.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/press_scale.dart';
import '../workout_derived_metrics.dart';

class WorkoutFeaturedCarousel extends StatefulWidget {
  const WorkoutFeaturedCarousel({
    super.key,
    required this.plans,
    this.dashboard,
  });

  final List<MeWorkoutPlanSummary> plans;
  final MeDashboard? dashboard;

  @override
  State<WorkoutFeaturedCarousel> createState() => _WorkoutFeaturedCarouselState();
}

class _WorkoutFeaturedCarouselState extends State<WorkoutFeaturedCarousel> {
  late final PageController _ctrl = PageController(viewportFraction: 0.92);
  int _page = 0;
  bool _details = true;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Color _difficultyColor(String? d) {
    switch ((d ?? '').toLowerCase()) {
      case 'beginner':
        return AppColors.success;
      case 'intermediate':
        return AppColors.gold;
      case 'advanced':
        return AppColors.danger;
      default:
        return AppColors.neonBlueLite;
    }
  }

  @override
  Widget build(BuildContext context) {
    final coach = WorkoutDerivedMetrics.coachName(widget.dashboard);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text("TODAY'S PROTOCOL", style: FitnessText.label(context)),
            const Spacer(),
            CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () => setState(() => _details = !_details),
              child: Text(
                _details ? 'Hide lab data' : 'Show lab data',
                style: FitnessText.chip(context, color: AppColors.neonCyan),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        SizedBox(
          height: 320,
          child: PageView.builder(
            controller: _ctrl,
            itemCount: widget.plans.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (context, i) {
              final p = widget.plans[i];
              final diffC = _difficultyColor(p.difficultyLevel);
              final kcal = WorkoutDerivedMetrics.estimatedSessionKcal(p);
              return Padding(
                padding: const EdgeInsets.only(right: AppSpacing.sm),
                child: PressScale(
                  onTap: () => context.go('/workouts/${p.id}', extra: p),
                  child: AnimatedScale(
                    scale: _page == i ? 1 : 0.96,
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOutCubic,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(28),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.bgDarkDeep,
                                  diffC.withValues(alpha: 0.35),
                                  AppColors.neonPurple.withValues(alpha: 0.22),
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                            ),
                          ),
                          Positioned(
                            right: -30,
                            top: -20,
                            child: Icon(
                              CupertinoIcons.flame_fill,
                              size: 160,
                              color: CupertinoColors.white.withValues(alpha: 0.06),
                            ),
                          ),
                          Positioned.fill(
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    CupertinoColors.black.withValues(alpha: 0.05),
                                    CupertinoColors.black.withValues(alpha: 0.62),
                                  ],
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                ),
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(AppSpacing.lg),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(999),
                                        color: diffC.withValues(alpha: 0.2),
                                        border: Border.all(color: diffC.withValues(alpha: 0.45)),
                                      ),
                                      child: Text(
                                        (p.difficultyLevel ?? 'PROGRAM').toUpperCase(),
                                        style: FitnessText.label(context).copyWith(color: diffC),
                                      ),
                                    ),
                                    const Spacer(),
                                    Icon(
                                      CupertinoIcons.chevron_forward,
                                      size: 18,
                                      color: CupertinoColors.white.withValues(alpha: 0.55),
                                    ),
                                  ],
                                ),
                                const Spacer(),
                                Text(
                                  p.planName,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: FitnessText.display(context, size: 24)
                                      .copyWith(color: CupertinoColors.white),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  'Focus • ${p.workoutType}',
                                  style: FitnessText.body(context)
                                      .copyWith(color: CupertinoColors.white.withValues(alpha: 0.78)),
                                ),
                                const SizedBox(height: AppSpacing.md),
                                if (_details)
                                  AnimatedCrossFade(
                                    firstChild: const SizedBox.shrink(),
                                    secondChild: Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        Wrap(
                                          spacing: 8,
                                          runSpacing: 8,
                                          children: [
                                            _Chip(
                                              icon: CupertinoIcons.timer,
                                              label: p.durationMinutes != null && p.durationMinutes! > 0
                                                  ? '${p.durationMinutes} min'
                                                  : 'Flexible',
                                            ),
                                            _Chip(
                                              icon: CupertinoIcons.flame,
                                              label: '$kcal kcal est.',
                                            ),
                                            _Chip(
                                              icon: CupertinoIcons.person_fill,
                                              label: coach,
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    crossFadeState:
                                        _details ? CrossFadeState.showSecond : CrossFadeState.showFirst,
                                    duration: const Duration(milliseconds: 280),
                                  ),
                                const SizedBox(height: AppSpacing.md),
                                Container(
                                  height: 52,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(16),
                                    gradient: AppColors.neonGradient,
                                    boxShadow: AppColors.purpleGlow(opacity: 0.35, blur: 22),
                                  ),
                                  child: CupertinoButton(
                                    padding: EdgeInsets.zero,
                                    onPressed: () => context.go('/workouts/${p.id}', extra: p),
                                    child: Center(
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(CupertinoIcons.play_fill, color: CupertinoColors.white),
                                          const SizedBox(width: 8),
                                          Text(
                                            'START WORKOUT',
                                            style: FitnessText.chip(context).copyWith(
                                              color: CupertinoColors.white,
                                              letterSpacing: 1.2,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ).animate(delay: (i * 40).ms).fadeIn(duration: 360.ms).slideX(begin: 0.04, end: 0);
            },
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(widget.plans.length, (i) {
            final active = i == _page;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: active ? 22 : 7,
              height: 7,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(999),
                color: active
                    ? AppColors.neonCyan
                    : CupertinoColors.white.withValues(alpha: 0.18),
              ),
            );
          }),
        ),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: CupertinoColors.white.withValues(alpha: 0.1),
        border: Border.all(color: CupertinoColors.white.withValues(alpha: 0.14)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: CupertinoColors.white.withValues(alpha: 0.85)),
          const SizedBox(width: 6),
          Text(
            label,
            style: FitnessText.chip(context).copyWith(color: CupertinoColors.white.withValues(alpha: 0.9)),
          ),
        ],
      ),
    );
  }
}
