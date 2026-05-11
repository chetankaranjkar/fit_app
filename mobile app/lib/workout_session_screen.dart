import 'dart:math' as math;

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import 'models/me_models.dart';
import 'providers/me_providers.dart';
import 'services/me_service.dart';
import 'theme/app_colors.dart';
import 'theme/app_theme.dart';
import 'theme/app_typography.dart';
import 'widgets/app_button.dart';
import 'widgets/glass_card.dart';
import 'widgets/premium_background.dart';

/// Live workout: plan exercises with last weight/reps + per-set logging (saved to `/api/me/workout-sessions/complete`).
class WorkoutSessionScreen extends ConsumerStatefulWidget {
  const WorkoutSessionScreen({super.key, required this.plan});

  final MeWorkoutPlanSummary plan;

  @override
  ConsumerState<WorkoutSessionScreen> createState() => _WorkoutSessionScreenState();
}

class _WorkoutSessionScreenState extends ConsumerState<WorkoutSessionScreen> {
  late final DateTime _sessionStart;

  @override
  void initState() {
    super.initState();
    _sessionStart = DateTime.now();
  }

  Future<void> _onComplete(
    List<MeWorkoutSetEntry> sets,
    int durationMinutes,
  ) async {
    if (sets.isEmpty) {
      HapticFeedback.mediumImpact();
      showCupertinoDialog<void>(
        context: context,
        builder: (ctx) => CupertinoAlertDialog(
          title: const Text('Nothing to save'),
          content: const Text('Log at least one set with reps greater than zero.'),
          actions: [
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      return;
    }
    try {
      await MeService.instance.completeWorkoutSession(
        workoutPlanId: widget.plan.id,
        durationMinutes: durationMinutes,
        sets: sets,
      );
      if (!mounted) return;
      ref.invalidate(workoutPlansProvider);
      ref.invalidate(dashboardProvider);
      HapticFeedback.heavyImpact();
      context.pop();
      showCupertinoDialog<void>(
        context: context,
        builder: (ctx) => CupertinoAlertDialog(
          title: const Text('Workout saved'),
          content: Text('${sets.length} set${sets.length == 1 ? '' : 's'} logged.'),
          actions: [
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Great'),
            ),
          ],
        ),
      );
    } on Object catch (e) {
      if (!mounted) return;
      showCupertinoDialog<void>(
        context: context,
        builder: (ctx) => CupertinoAlertDialog(
          title: const Text('Could not save'),
          content: Text(e.toString()),
          actions: [
            CupertinoDialogAction(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(workoutSessionTemplateProvider(widget.plan.id));

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Session'),
        border: null,
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () => context.pop(),
          child: const Text('Close'),
        ),
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          async.when(
            loading: () => const Center(child: CupertinoActivityIndicator()),
            error: (e, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Text(
                  e.toString(),
                  style: AppType.body.copyWith(color: AppColors.danger),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            data: (template) {
              if (template.isRestDay) {
                return _SessionPlaceholder(
                  icon: CupertinoIcons.moon_zzz,
                  title: 'Rest day',
                  subtitle: template.todayDayName != null && template.todayDayName!.trim().isNotEmpty
                      ? '${template.todayDayName!.trim()} - recovery is part of the plan.'
                      : 'Recovery is part of the plan.',
                );
              }
              if (template.exercises.isEmpty) {
                return const _SessionPlaceholder(
                  icon: CupertinoIcons.tray,
                  title: 'No exercises today',
                  subtitle: 'Nothing is assigned for this weekday on your plan split.',
                );
              }
              return _SessionForm(
                plan: widget.plan,
                template: template,
                sessionStart: _sessionStart,
                onComplete: _onComplete,
              );
            },
          ),
        ],
      ),
    );
  }
}

class _SessionPlaceholder extends StatelessWidget {
  const _SessionPlaceholder({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 48,
              color: AppColors.resolveTextSecondary(context),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              title,
              textAlign: TextAlign.center,
              style: AppType.title2.copyWith(
                color: AppColors.resolveText(context),
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: AppType.body.copyWith(color: AppColors.resolveTextSecondary(context)),
            ),
          ],
        ),
      ),
    );
  }
}

class _SessionForm extends StatefulWidget {
  const _SessionForm({
    required this.plan,
    required this.template,
    required this.sessionStart,
    required this.onComplete,
  });

  final MeWorkoutPlanSummary plan;
  final MeWorkoutSessionTemplate template;
  final DateTime sessionStart;
  final Future<void> Function(List<MeWorkoutSetEntry> sets, int durationMinutes) onComplete;

  @override
  State<_SessionForm> createState() => _SessionFormState();
}

class _SessionFormState extends State<_SessionForm> {
  final Map<int, List<TextEditingController>> _weightByExercise = {};
  final Map<int, List<TextEditingController>> _repsByExercise = {};
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    for (final line in widget.template.exercises) {
      final setCount = math.max(1, line.targetSets);
      final wSeed = line.lastWeightUsed ?? line.suggestedWeight;
      final rSeed = line.lastRepsDone ?? line.targetReps;
      _weightByExercise[line.exerciseId] = List.generate(
        setCount,
        (_) => TextEditingController(
          text: wSeed != null && wSeed > 0 ? _fmtNum(wSeed) : '',
        ),
      );
      _repsByExercise[line.exerciseId] = List.generate(
        setCount,
        (_) => TextEditingController(
          text: rSeed > 0 ? '$rSeed' : '',
        ),
      );
    }
  }

  @override
  void dispose() {
    for (final list in _weightByExercise.values) {
      for (final c in list) {
        c.dispose();
      }
    }
    for (final list in _repsByExercise.values) {
      for (final c in list) {
        c.dispose();
      }
    }
    super.dispose();
  }

  String _fmtNum(double v) {
    if (v == v.roundToDouble()) return '${v.round()}';
    return v.toStringAsFixed(1);
  }

  List<MeWorkoutSetEntry> _collectSets() {
    final out = <MeWorkoutSetEntry>[];
    for (final line in widget.template.exercises) {
      final wList = _weightByExercise[line.exerciseId]!;
      final rList = _repsByExercise[line.exerciseId]!;
      for (var i = 0; i < wList.length; i++) {
        final reps = int.tryParse(rList[i].text.trim());
        if (reps == null || reps <= 0) continue;
        final raw = wList[i].text.trim();
        final w = raw.isEmpty ? null : double.tryParse(raw.replaceAll(',', '.'));
        out.add(MeWorkoutSetEntry(
          exerciseId: line.exerciseId,
          setNumber: i + 1,
          repsDone: reps,
          weightUsed: w,
        ));
      }
    }
    return out;
  }

  Future<void> _finish() async {
    if (_saving) return;
    final sets = _collectSets();
    final mins = DateTime.now().difference(widget.sessionStart).inMinutes.clamp(1, 600);
    setState(() => _saving = true);
    try {
      await widget.onComplete(sets, mins);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.lg),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    Text(
                      widget.plan.planName,
                      style: AppType.title2.copyWith(
                        color: AppColors.resolveText(context),
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Last weight/reps help you progress safely. Adjust fields for each set.',
                      style: AppType.footnote.copyWith(
                        color: AppColors.resolveTextSecondary(context),
                      ),
                    ),
                    if (widget.template.filteredToToday) ...[
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Icon(
                            CupertinoIcons.calendar,
                            size: 14,
                            color: AppColors.accent.withValues(alpha: 0.9),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              widget.template.todayDayName != null &&
                                      widget.template.todayDayName!.trim().isNotEmpty
                                  ? 'Today: ${widget.template.todayDayName!.trim()}'
                                  : "Today's split",
                              style: AppType.footnote.copyWith(
                                color: AppColors.accent,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (!widget.template.isScheduledToday) ...[
                      const SizedBox(height: 10),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.warning.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(
                              CupertinoIcons.info,
                              size: 16,
                              color: AppColors.warning,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Not on your usual weekly schedule for this plan - you can still train.',
                                style: AppType.caption.copyWith(
                                  color: AppColors.resolveText(context),
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: AppSpacing.lg),
                    for (var i = 0; i < widget.template.exercises.length; i++) ...[
                      _ExerciseCard(
                        line: widget.template.exercises[i],
                        weightCtrls: _weightByExercise[widget.template.exercises[i].exerciseId]!,
                        repsCtrls: _repsByExercise[widget.template.exercises[i].exerciseId]!,
                      ),
                      if (i < widget.template.exercises.length - 1) const SizedBox(height: AppSpacing.md),
                    ],
                  ]),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, bottom + 16),
          child: AppButton(
            label: 'Finish & save workout',
            icon: CupertinoIcons.check_mark_circled_solid,
            onTap: _finish,
            isLoading: _saving,
          ),
        ),
      ],
    );
  }
}

class _ExerciseCard extends StatelessWidget {
  const _ExerciseCard({
    required this.line,
    required this.weightCtrls,
    required this.repsCtrls,
  });

  final MeWorkoutExerciseLine line;
  final List<TextEditingController> weightCtrls;
  final List<TextEditingController> repsCtrls;

  String? _lastLabel() {
    if (line.lastWeightUsed == null && line.lastRepsDone == null && line.lastSessionDateUtc == null) {
      return null;
    }
    final parts = <String>[];
    if (line.lastWeightUsed != null) parts.add('${line.lastWeightUsed} kg');
    if (line.lastRepsDone != null) parts.add('x ${line.lastRepsDone} reps');
    var s = parts.join(' ');
    if (line.lastSessionDateUtc != null) {
      s += ' \u00B7 ${DateFormat.yMMMd().format(line.lastSessionDateUtc!.toLocal())}';
    }
    return s;
  }

  @override
  Widget build(BuildContext context) {
    final last = _lastLabel();

    return GlassCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: Text(
                  '${line.order > 0 ? line.order : 1}',
                  style: AppType.headline.copyWith(
                    color: AppColors.accent,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      line.exerciseName,
                      style: AppType.headline.copyWith(color: AppColors.resolveText(context)),
                    ),
                    if ((line.bodyPartName ?? '').isNotEmpty)
                      Text(
                        line.bodyPartName!,
                        style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Target: ${line.targetSets} x ${line.targetReps}'
            '${line.restSeconds > 0 ? ' \u00B7 rest ${line.restSeconds}s' : ''}',
            style: AppType.caption.copyWith(
              color: AppColors.resolveTextSecondary(context),
              fontWeight: FontWeight.w600,
            ),
          ),
          if (last != null) ...[
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.neonBlue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(color: AppColors.neonBlueLite.withValues(alpha: 0.35)),
              ),
              child: Row(
                children: [
                  const Icon(CupertinoIcons.arrow_counterclockwise, size: 16, color: AppColors.neonBlueLite),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Last time: $last',
                      style: AppType.caption.copyWith(
                        color: AppColors.neonBlueLite,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          Text(
            'Log sets (kg)',
            style: AppType.caption.copyWith(
              color: AppColors.resolveTextSecondary(context),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          for (var i = 0; i < weightCtrls.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  SizedBox(
                    width: 56,
                    child: Text(
                      'Set ${i + 1}',
                      style: AppType.subhead.copyWith(color: AppColors.resolveTextSecondary(context)),
                    ),
                  ),
                  Expanded(
                    child: CupertinoTextField(
                      controller: weightCtrls[i],
                      placeholder: 'kg',
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: CupertinoColors.systemGrey6.resolveFrom(context),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: CupertinoTextField(
                      controller: repsCtrls[i],
                      placeholder: 'reps',
                      keyboardType: TextInputType.number,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: CupertinoColors.systemGrey6.resolveFrom(context),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
