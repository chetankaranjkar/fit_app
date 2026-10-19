import 'dart:async';
import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_exception.dart';
import '../../models/me_models.dart';
import '../../models/workout_tracking_models.dart';
import '../../providers/me_providers.dart';
import '../../providers/sync_status_provider.dart';
import '../../providers/workout_tracking_providers.dart';
import '../../services/workout_tracking_repository.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../widgets/fitness_text.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/press_scale.dart';
import '../../widgets/premium_background.dart';
import '../shell/shell_layout_metrics.dart';
import 'logic/recorded_work.dart';
import 'logic/session_duration.dart';
import 'logic/set_completion_validator.dart';
import 'logic/today_workout_gate.dart';
import 'workout_derived_metrics.dart';
import 'package:flutter/services.dart';
import 'widgets/plan_set_completion_row.dart';
import 'widgets/workout_band_card.dart';
import 'workout_flow_launcher.dart';
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
  final _repo = WorkoutTrackingRepository.instance;
  ActiveWorkoutSession? _session;
  int? _savingSetId;
  bool _finishing = false;

  @override
  void initState() {
    super.initState();
    unawaited(_resumeSession());
  }

  Future<void> _resumeSession() async {
    try {
      final memberId = await ref.read(memberIdProvider.future);
      final decision = await _repo.resolveToday(
        memberId: memberId,
        workoutPlanId: widget.plan.id,
      );
      if (!mounted || decision.session == null) return;
      if (decision.action != TodayWorkoutAction.resume &&
          decision.action != TodayWorkoutAction.viewCompleted) {
        return;
      }
      if (decision.session!.workoutPlanId != null &&
          decision.session!.workoutPlanId != widget.plan.id) {
        return;
      }
      setState(() {
        _session = decision.session;
        if (_isSaved(decision.session)) {
          for (final line in widget.tpl.exercises) {
            _expanded.add(line.planExerciseId);
          }
        }
      });
    } on Object {
      // Browsing the plan still works if today's session cannot be loaded.
    }
  }

  bool _isSaved(ActiveWorkoutSession? session) =>
      session != null &&
      (session.pendingCompleteSync || session.status.toLowerCase() == 'completed');

  List<TrackedWorkoutSet> _setsFor(int exerciseId) {
    final session = _session;
    if (session == null) return const [];
    for (final group in session.exercises) {
      if (group.exerciseId != exerciseId) continue;
      final sets = [...group.sets]..sort((a, b) => a.setNumber.compareTo(b.setNumber));
      return sets;
    }
    return const [];
  }

  Future<void> _logSet(MeWorkoutExerciseLine line, int setNumber, int reps, double weight) async {
    if (_isSaved(_session)) {
      _alert('Workout saved', 'Today’s workout is already complete. Start another session if you want to train again.');
      return;
    }
    final trackedBefore = _setsFor(line.exerciseId);
    final previousDone = setNumber <= 1 ||
        trackedBefore.any((s) => s.setNumber == setNumber - 1 && s.isCompleted);
    final blocked = SetCompletionValidation.previousSetRequired(
      setNumber: setNumber,
      previousSetCompleted: previousDone,
    );
    if (blocked != null) {
      _alert('Set order', blocked);
      return;
    }

    setState(() => _savingSetId = line.exerciseId * 100 + setNumber);
    try {
      final session = await _ensureSession();
      var tracked = _findSet(session, line.exerciseId, setNumber);
      if (tracked == null) {
        final reloaded = await _repo.reloadSession(session);
        if (reloaded != null && mounted) setState(() => _session = reloaded);
        tracked = reloaded == null ? null : _findSet(reloaded, line.exerciseId, setNumber);
      }
      if (tracked == null) {
        throw const ApiException('This set is not on today\'s workout session.');
      }
      await _repo.logSet(
        session: _session ?? session,
        workoutSessionExerciseId: tracked.id,
        actualWeight: weight,
        actualReps: reps,
        isCompleted: true,
      );
      final refreshed = await _repo.reloadSession(_session ?? session);
      if (mounted) setState(() => _session = refreshed ?? _session);
      HapticFeedback.mediumImpact();
      ref.invalidate(workoutTrackingDashboardProvider);
      ref.invalidate(workoutSessionHistoryProvider);
      ref.invalidate(activeWorkoutProvider);
      invalidateSyncStatus(ref);
    } on ApiException catch (e) {
      if (mounted) _alert('Could not save set', e.message);
      rethrow;
    } finally {
      if (mounted) setState(() => _savingSetId = null);
    }
  }

  Future<ActiveWorkoutSession> _ensureSession() async {
    final current = _session;
    if (_isSaved(current)) {
      throw const ApiException('This workout is already saved for today.');
    }
    if (current != null &&
        (current.workoutPlanId == null || current.workoutPlanId == widget.plan.id)) {
      return current;
    }
    final memberId = await ref.read(memberIdProvider.future);
    final decision = await _repo.resolveToday(
      memberId: memberId,
      workoutPlanId: widget.plan.id,
    );
    if (decision.action == TodayWorkoutAction.viewCompleted && decision.session != null) {
      if (mounted) setState(() => _session = decision.session);
      throw const ApiException('This workout is already saved for today.');
    }
    if (decision.action == TodayWorkoutAction.otherPlanInProgress) {
      throw const ApiException(
        'Another workout is still in progress. Finish that session before logging this plan.',
      );
    }
    final session = decision.action == TodayWorkoutAction.resume && decision.session != null
        ? decision.session!
        : await _repo.resolveOrStart(
            memberId: memberId,
            workoutPlanId: widget.plan.id,
          );
    if (session.workoutPlanId != null && session.workoutPlanId != widget.plan.id) {
      throw const ApiException(
        'Another workout is still in progress. Finish that session before logging this plan.',
      );
    }
    if (mounted) setState(() => _session = session);
    return session;
  }

  TrackedWorkoutSet? _findSet(ActiveWorkoutSession session, int exerciseId, int setNumber) {
    for (final group in session.exercises) {
      if (group.exerciseId != exerciseId) continue;
      for (final set in group.sets) {
        if (set.setNumber == setNumber) return set;
      }
    }
    return null;
  }

  void _alert(String title, String message) {
    showCupertinoDialog<void>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: Text(title),
        content: Text(message),
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

  Future<void> _finishWorkout() async {
    final session = _session;
    if (session == null || _finishing || _isSaved(session)) return;
    if (session.completedSets < session.totalSets) {
      final proceed = await showCupertinoDialog<bool>(
        context: context,
        builder: (ctx) => CupertinoAlertDialog(
          title: const Text('Finish incomplete workout?'),
          content: Text(
            '${session.completedSets} of ${session.totalSets} sets are logged. '
            'The rest stay unfinished and this session is saved as partial.',
          ),
          actions: [
            CupertinoDialogAction(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Keep going'),
            ),
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Finish partial'),
            ),
          ],
        ),
      );
      if (proceed != true || !mounted) return;
    }
    setState(() => _finishing = true);
    try {
      final done = await _repo.complete(session);
      if (mounted) {
        setState(() {
          _session = done;
          for (final line in widget.tpl.exercises) {
            _expanded.add(line.planExerciseId);
          }
        });
      }
      ref.invalidate(workoutTrackingDashboardProvider);
      ref.invalidate(workoutSessionHistoryProvider);
      ref.invalidate(activeWorkoutProvider);
      ref.invalidate(todayWorkoutProvider);
      ref.invalidate(dashboardProvider);
      invalidateSyncStatus(ref);
      if (mounted) {
        _alert('Workout saved', _completionSummary(done));
      }
    } on ApiException catch (e) {
      if (mounted) _alert('Could not finish', e.message);
    } finally {
      if (mounted) setState(() => _finishing = false);
    }
  }

  String _completionSummary(ActiveWorkoutSession session) {
    final exercises = session.exercises.where((g) => g.sets.any((s) => s.isCompleted)).length;
    final volume = RecordedWork.score(
      session.totalSets,
      [
        for (final group in session.exercises)
          for (final set in group.sets)
            if (set.isCompleted) PerformedSet(weight: set.actualWeight, reps: set.actualReps),
      ],
    );
    final duration = trainingDurationMinutes([
      for (final group in session.exercises)
        for (final set in group.sets)
          if (set.isCompleted) set.completedAt,
    ]);
    final partial = session.completedSets < session.totalSets;
    return [
      if (partial) 'Partial completion',
      '$exercises exercises',
      '${session.completedSets}/${session.totalSets} sets',
      if (duration != null && duration > 0) '$duration min',
      recordedVolumeLabel(volume: volume.volume, volumeComplete: volume.volumeComplete),
      if (session.pendingCompleteSync) 'Saved on device — waiting to sync',
    ].join(' · ');
  }

  Future<void> _startAnother() async {
    final proceed = await showCupertinoDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Start another session?'),
        content: const Text('The workout already saved today stays in your history.'),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Start another session'),
          ),
        ],
      ),
    );
    if (proceed != true || !mounted) return;
    await launchLiveWorkoutSession(
      context,
      ref,
      plan: widget.plan,
      template: widget.tpl,
      startAnother: true,
    );
  }

  int? _savingSetNumberFor(int exerciseId) {
    final saving = _savingSetId;
    if (saving == null) return null;
    if (saving ~/ 100 != exerciseId) return null;
    return saving % 100;
  }

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
                    if (tpl.warmups.isNotEmpty) ...[
                      Text('WARMUP', style: FitnessText.label(context)),
                      const SizedBox(height: AppSpacing.sm),
                      for (final w in tpl.warmups) ...[
                        GlassCard(
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(w.name, style: FitnessText.title(context)),
                                    Text(
                                      '${w.durationSeconds}s · ${w.bodyPart ?? 'Mobility'}',
                                      style: FitnessText.body(context),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                      ],
                      const SizedBox(height: AppSpacing.md),
                    ],
                    if (tpl.exercises.isNotEmpty) ...[
                      Row(
                        children: [
                          Text('WORKOUT', style: FitnessText.label(context)),
                          const Spacer(),
                          Text(
                            _session == null
                                ? '${tpl.exercises.length} blocks'
                                : '${_session!.completedSets} sets saved',
                            style: FitnessText.chip(context, color: AppColors.neonCyan),
                          ),
                        ],
                      ),
                      if ((_session?.completedSets ?? 0) > 0 && !_isSaved(_session)) ...[
                        const SizedBox(height: AppSpacing.sm),
                        CupertinoButton(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          color: AppColors.success.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(14),
                          onPressed: _finishing ? null : _finishWorkout,
                          child: Text(
                            _finishing ? 'Saving workout…' : 'Finish workout',
                            style: FitnessText.chip(context, color: AppColors.success),
                          ),
                        ),
                      ],
                      if (_isSaved(_session)) ...[
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          _session!.pendingCompleteSync
                              ? 'Saved on device — waiting to sync'
                              : 'Synced',
                          style: FitnessText.body(context, color: AppColors.success),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          _completionSummary(_session!),
                          style: FitnessText.body(context),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        WorkoutBandCard(session: _session!),
                      ],
                      const SizedBox(height: AppSpacing.sm),
                    ],
                    for (var i = 0; i < tpl.exercises.length; i++) ...[
                      _ExerciseLabCard(
                        key: ValueKey(tpl.exercises[i].planExerciseId),
                        line: tpl.exercises[i],
                        trackedSets: _setsFor(tpl.exercises[i].exerciseId),
                        savingSetNumber: _savingSetNumberFor(tpl.exercises[i].exerciseId),
                        expanded: _expanded.contains(tpl.exercises[i].planExerciseId),
                        readOnly: _isSaved(_session),
                        onToggle: () => _toggle(tpl.exercises[i].planExerciseId),
                        onLogSet: (setNumber, reps, weight) =>
                            _logSet(tpl.exercises[i], setNumber, reps, weight),
                      ),
                      if (i != tpl.exercises.length - 1) const SizedBox(height: AppSpacing.md),
                    ],
                    if (tpl.stretches.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.lg),
                      Text('RECOVERY STRETCH', style: FitnessText.label(context)),
                      const SizedBox(height: AppSpacing.sm),
                      for (final s in tpl.stretches) ...[
                        GlassCard(
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(s.name, style: FitnessText.title(context)),
                                    Text(
                                      '${s.durationSeconds}s · ${s.bodyPart ?? 'Mobility'}',
                                      style: FitnessText.body(context),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                      ],
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
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () {
                final saved = _isSaved(_session);
                final live = _session != null && !saved;
                if (saved) return;
                if (live) {
                  launchLiveWorkoutSession(context, ref, plan: plan, template: tpl);
                  return;
                }
                launchFullWorkoutFlow(context, ref, plan: plan);
              },
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
                      Icon(
                        _isSaved(_session) ? CupertinoIcons.checkmark_alt : CupertinoIcons.play_fill,
                        color: CupertinoColors.white,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _isSaved(_session)
                            ? 'VIEW COMPLETED WORKOUT'
                            : _session != null
                                ? 'RESUME WORKOUT'
                                : 'START WORKOUT',
                        style: FitnessText.chip(context)
                            .copyWith(color: CupertinoColors.white, letterSpacing: 1.1),
                      ),
                    ],
                  ),
                ),
              ),
                ),
                if (_isSaved(_session))
                  CupertinoButton(
                    onPressed: _startAnother,
                    child: Text(
                      'Start another session',
                      style: FitnessText.chip(context, color: AppColors.neonCyan),
                    ),
                  ),
              ],
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
                    [
                      plan.workoutType,
                      'est. $kcal kcal',
                      if (tpl.templateMode != 'LEGACY' && tpl.currentProgramWeek != null)
                        'Week ${tpl.currentProgramWeek}',
                      if (tpl.templateMode != 'LEGACY' && tpl.currentProgramDay != null)
                        'Day ${tpl.currentProgramDay}',
                    ].join(' • '),
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
    super.key,
    required this.line,
    required this.trackedSets,
    required this.expanded,
    required this.onToggle,
    required this.onLogSet,
    this.savingSetNumber,
    this.readOnly = false,
  });

  final MeWorkoutExerciseLine line;
  final List<TrackedWorkoutSet> trackedSets;
  final bool expanded;
  final VoidCallback onToggle;
  final Future<void> Function(int setNumber, int reps, double weight) onLogSet;
  final int? savingSetNumber;
  final bool readOnly;

  @override
  State<_ExerciseLabCard> createState() => _ExerciseLabCardState();
}

class _ExerciseLabCardState extends State<_ExerciseLabCard> {
  int? _restLeft;
  Timer? _restTimer;
  late final List<TextEditingController> _weightCtrls;
  late final List<TextEditingController> _repsCtrls;

  @override
  void initState() {
    super.initState();
    final line = widget.line;
    final setCount = math.max(1, line.targetSets);
    _weightCtrls = List.generate(setCount, (i) {
      final tracked = _tracked(i + 1);
      final wSeed = tracked?.actualWeight ?? tracked?.targetWeight ?? line.lastWeightUsed ?? line.suggestedWeight;
      return TextEditingController(text: wSeed != null && wSeed > 0 ? _fmtNum(wSeed) : '');
    });
    _repsCtrls = List.generate(setCount, (i) {
      final tracked = _tracked(i + 1);
      final rSeed = tracked?.actualReps ?? tracked?.targetReps ?? line.lastRepsDone ?? line.targetReps;
      return TextEditingController(text: rSeed > 0 ? '$rSeed' : '');
    });
  }

  TrackedWorkoutSet? _tracked(int setNumber) {
    for (final set in widget.trackedSets) {
      if (set.setNumber == setNumber) return set;
    }
    return null;
  }

  bool _isCompleted(int setNumber) => _tracked(setNumber)?.isCompleted == true;

  bool get _exerciseDone {
    final needed = math.max(1, widget.line.targetSets);
    if (widget.trackedSets.length < needed) return false;
    return widget.trackedSets.every((set) => set.isCompleted);
  }

  String _fmtNum(double v) {
    if (v == v.roundToDouble()) return '${v.round()}';
    return v.toStringAsFixed(1);
  }

  @override
  void didUpdateWidget(covariant _ExerciseLabCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    for (var i = 0; i < _weightCtrls.length; i++) {
      final set = _tracked(i + 1);
      if (set == null || !set.isCompleted) continue;
      if (set.actualWeight != null) _weightCtrls[i].text = _fmtNum(set.actualWeight!);
      if (set.actualReps != null) _repsCtrls[i].text = '${set.actualReps}';
    }
  }

  @override
  void dispose() {
    _restTimer?.cancel();
    for (final c in _weightCtrls) {
      c.dispose();
    }
    for (final c in _repsCtrls) {
      c.dispose();
    }
    super.dispose();
  }

  void _startRest() {
    _restTimer?.cancel();
    final total = widget.line.restSeconds <= 0 ? 60 : widget.line.restSeconds;
    setState(() => _restLeft = total);
    _restTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final left = (_restLeft ?? 1) - 1;
      if (left <= 0) {
        timer.cancel();
        setState(() => _restLeft = null);
        return;
      }
      setState(() => _restLeft = left);
    });
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
                      if (line.lastWeightUsed != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Previous ${line.lastWeightUsed} kg × ${line.lastRepsDone ?? line.targetReps}',
                          style: FitnessText.body(context, color: AppColors.success),
                        ),
                      ],
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
                          if (_exerciseDone)
                            const _TinyPill(label: 'Completed', color: AppColors.success)
                          else
                            _TinyPill(
                              label:
                                  '${widget.trackedSets.where((s) => s.isCompleted).length}/${math.max(1, line.targetSets)} logged',
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
                        completed: _isCompleted(i + 1),
                        saving: widget.savingSetNumber == i + 1,
                        lockedReason: widget.readOnly
                            ? 'Saved'
                            : SetCompletionValidation.previousSetRequired(
                                setNumber: i + 1,
                                previousSetCompleted: i == 0 || _isCompleted(i),
                              ),
                        readOnly: widget.readOnly,
                        onCompleted: (reps, weight) => widget.onLogSet(i + 1, reps, weight),
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
          'Log this session to record weights for each exercise.',
          style: FitnessText.body(context),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('LAST SESSION WEIGHTS', style: FitnessText.label(context)),
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
