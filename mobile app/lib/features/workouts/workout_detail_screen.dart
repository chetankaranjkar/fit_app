import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../widgets/fitness_text.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/press_scale.dart';
import '../../widgets/premium_background.dart';
import '../shell/shell_layout_metrics.dart';
import 'workout_derived_metrics.dart';
import 'package:flutter/services.dart';
import 'widgets/plan_set_completion_row.dart';
import 'workout_session_launcher.dart';

class WorkoutDetailScreen extends ConsumerWidget {
  const WorkoutDetailScreen({super.key, required this.plan});

  final MeWorkoutPlanSummary plan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(workoutSessionTemplateProvider(plan.id));

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          session.when(
            loading: () => const Center(child: CupertinoActivityIndicator(radius: 14)),
            error: (e, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Text(e.toString(), style: FitnessText.body(context)),
              ),
            ),
            data: (tpl) => _WorkoutDetailBody(plan: plan, tpl: tpl),
          ),
        ],
      ),
    );
  }
}

class _WorkoutDetailBody extends ConsumerStatefulWidget {
  const _WorkoutDetailBody({required this.plan, required this.tpl});

  final MeWorkoutPlanSummary plan;
  final MeWorkoutSessionTemplate tpl;

  @override
  ConsumerState<_WorkoutDetailBody> createState() => _WorkoutDetailBodyState();
}

class _WorkoutDetailBodyState extends ConsumerState<_WorkoutDetailBody> {
  final Set<int> _expanded = {};

  void _toggle(int id) {
    setState(() {
      if (_expanded.contains(id)) {
        _expanded.remove(id);
      } else {
        _expanded.add(id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final plan = widget.plan;
    final tpl = widget.tpl;
    final bottomPad = ShellLayoutMetrics.contentBottomPadding(context);

    return Column(
      children: [
        Expanded(
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
            slivers: [
              CupertinoSliverNavigationBar(
                largeTitle: Text(plan.planName),
                border: null,
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(
                  ShellLayoutMetrics.horizontalInset,
                  AppSpacing.sm,
                  ShellLayoutMetrics.horizontalInset,
                  AppSpacing.lg,
                ),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _DetailHero(plan: plan, tpl: tpl),
                    const SizedBox(height: AppSpacing.lg),
                    if (tpl.isRestDay)
                      GlassCard(
                        radius: 24,
                        tint: AppColors.neonPurple.withValues(alpha: 0.08),
                        child: Row(
                          children: [
                            const Icon(CupertinoIcons.moon_stars_fill, color: AppColors.neonPurple),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Recovery emphasis', style: FitnessText.title(context)),
                                  Text(
                                    '${tpl.todayDayName ?? 'Today'} is programmed as rest. '
                                    'Keep nervous system fresh.',
                                    style: FitnessText.body(context),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (tpl.exercises.isNotEmpty) ...[
                      Row(
                        children: [
                          Text('EXERCISE STACK', style: FitnessText.label(context)),
                          const Spacer(),
                          Text(
                            '${tpl.exercises.length} blocks',
                            style: FitnessText.chip(context, color: AppColors.neonCyan),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                    ],
                    for (var i = 0; i < tpl.exercises.length; i++) ...[
                      _ExerciseLabCard(
                        line: tpl.exercises[i],
                        expanded: _expanded.contains(tpl.exercises[i].planExerciseId),
                        onToggle: () => _toggle(tpl.exercises[i].planExerciseId),
                      ),
                      if (i != tpl.exercises.length - 1) const SizedBox(height: AppSpacing.md),
                    ],
                    const SizedBox(height: AppSpacing.lg),
                    if (tpl.exercises.isNotEmpty) _VolumeInsight(exercises: tpl.exercises),
                    const SizedBox(height: AppSpacing.lg),
                    _PrRecordsStrip(exercises: tpl.exercises),
                    const SizedBox(height: AppSpacing.lg),
                    _CoachTipCard(plan: plan),
                    SizedBox(height: bottomPad + 8),
                  ]),
                ),
              ),
            ],
          ),
        ),
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppColors.bgDark.withValues(alpha: 0.88),
            border: Border(top: BorderSide(color: AppColors.borderDark.withValues(alpha: 0.55))),
          ),
          child: SafeArea(
            top: false,
            minimum: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.md),
            child: CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () => launchLiveWorkoutSession(context, ref, plan: plan),
              child: Container(
                height: 54,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  gradient: AppColors.neonGradient,
                  boxShadow: AppColors.purpleGlow(opacity: 0.4, blur: 22),
                ),
                child: Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(CupertinoIcons.play_fill, color: CupertinoColors.white),
                      const SizedBox(width: 8),
                      Text(
                        'START WORKOUT',
                        style: FitnessText.chip(context)
                            .copyWith(color: CupertinoColors.white, letterSpacing: 1.1),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _DetailHero extends StatelessWidget {
  const _DetailHero({required this.plan, required this.tpl});

  final MeWorkoutPlanSummary plan;
  final MeWorkoutSessionTemplate tpl;

  Color _difficultyColor() {
    switch ((plan.difficultyLevel ?? '').toLowerCase()) {
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
    final diff = _difficultyColor();
    final kcal = WorkoutDerivedMetrics.estimatedSessionKcal(plan);

    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: SizedBox(
        height: 200,
        child: Stack(
          fit: StackFit.expand,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.bgDarkDeep,
                    diff.withValues(alpha: 0.45),
                    AppColors.neonPurple.withValues(alpha: 0.3),
                  ],
                ),
              ),
            ),
            Positioned(
              right: -24,
              bottom: -10,
              child: Icon(
                CupertinoIcons.sportscourt_fill,
                size: 180,
                color: CupertinoColors.white.withValues(alpha: 0.05),
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
                          color: diff.withValues(alpha: 0.18),
                          border: Border.all(color: diff.withValues(alpha: 0.45)),
                        ),
                        child: Text(
                          (plan.difficultyLevel ?? plan.workoutType).toUpperCase(),
                          style: FitnessText.label(context).copyWith(color: diff),
                        ),
                      ),
                      const Spacer(),
                      if (tpl.todayDayName != null)
                        Text(
                          tpl.todayDayName!.toUpperCase(),
                          style: FitnessText.label(context).copyWith(color: AppColors.neonCyan),
                        ),
                    ],
                  ),
                  const Spacer(),
                  Text(
                    plan.planName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: FitnessText.display(context, size: 26).copyWith(color: CupertinoColors.white),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${plan.workoutType} • est. $kcal kcal',
                    style: FitnessText.body(context).copyWith(
                      color: CupertinoColors.white.withValues(alpha: 0.75),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 360.ms).slideY(begin: 0.04, end: 0);
  }
}

class _ExerciseLabCard extends StatefulWidget {
  const _ExerciseLabCard({
    required this.line,
    required this.expanded,
    required this.onToggle,
  });

  final MeWorkoutExerciseLine line;
  final bool expanded;
  final VoidCallback onToggle;

  @override
  State<_ExerciseLabCard> createState() => _ExerciseLabCardState();
}

class _ExerciseLabCardState extends State<_ExerciseLabCard> with TickerProviderStateMixin {
  int? _restLeft;
  Ticker? _restTicker;
  late final List<TextEditingController> _weightCtrls;
  late final List<TextEditingController> _repsCtrls;
  final Set<int> _completedSetIndices = {};
  int? _savingSetIndex;

  @override
  void initState() {
    super.initState();
    final line = widget.line;
    final setCount = math.max(1, line.targetSets);
    final wSeed = line.lastWeightUsed ?? line.suggestedWeight;
    final rSeed = line.lastRepsDone ?? line.targetReps;
    _weightCtrls = List.generate(
      setCount,
      (_) => TextEditingController(
        text: wSeed != null && wSeed > 0 ? _fmtNum(wSeed) : '',
      ),
    );
    _repsCtrls = List.generate(
      setCount,
      (_) => TextEditingController(text: rSeed > 0 ? '$rSeed' : ''),
    );
  }

  String _fmtNum(double v) {
    if (v == v.roundToDouble()) return '${v.round()}';
    return v.toStringAsFixed(1);
  }

  @override
  void dispose() {
    _restTicker?.dispose();
    for (final c in _weightCtrls) {
      c.dispose();
    }
    for (final c in _repsCtrls) {
      c.dispose();
    }
    super.dispose();
  }

  void _startRest() {
    _restTicker?.dispose();
    final total = widget.line.restSeconds;
    final start = DateTime.now();
    setState(() => _restLeft = total);
    _restTicker = createTicker((elapsed) {
      final gone = DateTime.now().difference(start).inSeconds;
      final left = total - gone;
      if (!mounted) return;
      if (left <= 0) {
        _restTicker?.dispose();
        setState(() => _restLeft = null);
        return;
      }
      setState(() => _restLeft = left);
    })..start();
  }

  int _activation() {
    final h = math.max(1, widget.line.exerciseName.hashCode.abs());
    return 55 + (h % 41);
  }

  @override
  Widget build(BuildContext context) {
    final line = widget.line;

    return PressScale(
      onTap: widget.onToggle,
      child: GlassCard(
        radius: 26,
        padding: const EdgeInsets.all(AppSpacing.md),
        tint: AppColors.neonBlue.withValues(alpha: 0.04),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: SizedBox(
                    width: 72,
                    height: 72,
                    child: Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.neonBlue.withValues(alpha: 0.75),
                                  AppColors.neonPurple.withValues(alpha: 0.75),
                                ],
                              ),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              line.exerciseName.isNotEmpty ? line.exerciseName[0].toUpperCase() : '?',
                              style: FitnessText.display(context, size: 28)
                                  .copyWith(color: CupertinoColors.white),
                            ),
                          ),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(line.exerciseName, style: FitnessText.title(context).copyWith(fontSize: 18)),
                      const SizedBox(height: 4),
                      Text(
                        '${line.targetSets} × ${line.targetReps} • Rest ${line.restSeconds}s',
                        style: FitnessText.body(context),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          _TinyPill(
                            label: line.suggestedWeight != null
                                ? '${line.suggestedWeight} kg target'
                                : 'Auto load',
                            color: AppColors.accent,
                          ),
                          const SizedBox(width: 6),
                          _TinyPill(
                            label: '${_activation()}% activation',
                            color: AppColors.neonCyan,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Icon(
                  widget.expanded ? CupertinoIcons.chevron_up : CupertinoIcons.chevron_down,
                  color: AppColors.resolveTextSecondary(context),
                  size: 18,
                ),
              ],
            ),
            AnimatedCrossFade(
              firstChild: const SizedBox.shrink(),
              secondChild: Padding(
                padding: const EdgeInsets.only(top: AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = 0; i < _weightCtrls.length; i++)
                      PlanSetCompletionRow(
                        setNumber: i + 1,
                        weightController: _weightCtrls[i],
                        repsController: _repsCtrls[i],
                        completed: _completedSetIndices.contains(i),
                        saving: _savingSetIndex == i,
                        onCompleted: (reps, weight) async {
                          setState(() => _savingSetIndex = i);
                          await Future<void>.delayed(const Duration(milliseconds: 180));
                          if (!mounted) return;
                          setState(() {
                            _completedSetIndices.add(i);
                            _savingSetIndex = null;
                          });
                          HapticFeedback.mediumImpact();
                        },
                      ),
                    const SizedBox(height: AppSpacing.sm),
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      color: AppColors.neonCyan.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(14),
                      onPressed: _restLeft == null ? _startRest : null,
                      child: Text(
                        _restLeft != null ? 'Rest ${_restLeft}s' : 'Start rest',
                        style: FitnessText.chip(context, color: AppColors.neonCyan),
                      ),
                    ),
                    if (line.lastWeightUsed != null) ...[
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Last hit: ${line.lastWeightUsed} kg × ${line.lastRepsDone ?? line.targetReps} reps',
                        style: FitnessText.body(context, color: AppColors.success),
                      ),
                    ],
                  ],
                ),
              ),
              crossFadeState:
                  widget.expanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
              duration: const Duration(milliseconds: 260),
            ),
          ],
        ),
      ),
    );
  }
}

class _TinyPill extends StatelessWidget {
  const _TinyPill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: color.withValues(alpha: 0.12),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(label, style: FitnessText.label(context).copyWith(color: color)),
    );
  }
}

class _VolumeInsight extends StatelessWidget {
  const _VolumeInsight({required this.exercises});

  final List<MeWorkoutExerciseLine> exercises;

  @override
  Widget build(BuildContext context) {
    final vols = exercises
        .map(
          (e) => FlSpot(
            e.order.toDouble(),
            (e.targetSets * e.targetReps * (e.suggestedWeight ?? 20) / 50).clamp(1, 40),
          ),
        )
        .toList();

    return GlassCard(
      radius: 26,
      tint: AppColors.neonPurple.withValues(alpha: 0.06),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('VOLUME ORBIT', style: FitnessText.label(context)),
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            height: 120,
            child: LineChart(
              LineChartData(
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (_) => FlLine(
                    color: AppColors.resolveBorder(context).withValues(alpha: 0.25),
                    strokeWidth: 0.6,
                  ),
                ),
                titlesData: const FlTitlesData(show: false),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: vols,
                    isCurved: true,
                    color: AppColors.neonCyan,
                    barWidth: 3,
                    dotData: FlDotData(
                      show: true,
                      getDotPainter: (a, b, c, d) => FlDotCirclePainter(
                        radius: 3,
                        color: AppColors.neonBlue,
                      ),
                    ),
                  ),
                ],
              ),
              duration: const Duration(milliseconds: 220),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 350.ms);
  }
}

class _PrRecordsStrip extends StatelessWidget {
  const _PrRecordsStrip({required this.exercises});

  final List<MeWorkoutExerciseLine> exercises;

  @override
  Widget build(BuildContext context) {
    final prs = exercises.where((e) => e.lastWeightUsed != null).take(4).toList();
    if (prs.isEmpty) {
      return GlassCard(
        radius: 26,
        child: Text(
          'Log this session to unlock PR telemetry for every lift.',
          style: FitnessText.body(context),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('LAST SESSION PEAKS', style: FitnessText.label(context)),
        const SizedBox(height: AppSpacing.sm),
        ...prs.map(
          (e) => Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: GlassCard(
              radius: 20,
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Row(
                children: [
                  const Icon(CupertinoIcons.time, color: AppColors.gold, size: 18),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      e.exerciseName,
                      style: FitnessText.title(context).copyWith(fontSize: 16),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    '${e.lastWeightUsed} kg',
                    style: FitnessText.metric(context, size: 16).copyWith(color: AppColors.neonCyan),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _CoachTipCard extends StatelessWidget {
  const _CoachTipCard({required this.plan});

  final MeWorkoutPlanSummary plan;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: 26,
      tint: AppColors.success.withValues(alpha: 0.06),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(CupertinoIcons.info_circle_fill, color: AppColors.success),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('COACHING VECTOR', style: FitnessText.label(context)),
                const SizedBox(height: 4),
                Text(
                  plan.description?.trim().isNotEmpty == true
                      ? plan.description!.trim()
                      : 'Stack-quality reps beat rushed sets — own each eccentric before chasing load.',
                  style: FitnessText.body(context),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
