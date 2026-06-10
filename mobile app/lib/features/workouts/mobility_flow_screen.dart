import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/me_models.dart';
import 'workout_session_launcher.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../widgets/fitness_text.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import '../shell/shell_layout_metrics.dart';

enum MobilityPhase { warmup, stretch }

class MobilityFlowScreen extends ConsumerStatefulWidget {
  const MobilityFlowScreen({
    super.key,
    required this.plan,
    required this.template,
    required this.phase,
    this.afterWorkout = false,
    this.workoutDurationSeconds = 0,
    this.warmupsCompleted = 0,
    this.exercisesCompleted = 0,
  });

  final MeWorkoutPlanSummary plan;
  final MeWorkoutSessionTemplate template;
  final MobilityPhase phase;
  final bool afterWorkout;
  final int workoutDurationSeconds;
  final int warmupsCompleted;
  final int exercisesCompleted;

  @override
  ConsumerState<MobilityFlowScreen> createState() => _MobilityFlowScreenState();
}

class _MobilityFlowScreenState extends ConsumerState<MobilityFlowScreen> {
  int _index = 0;
  int _remaining = 0;
  int _countdown = 0;
  bool _showCountdown = true;
  Timer? _timer;
  final List<int> _completedIds = [];

  List<dynamic> get _items =>
      widget.phase == MobilityPhase.warmup ? widget.template.warmups : widget.template.stretches;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    _timer?.cancel();
    if (_items.isEmpty) {
      _finishPhase();
      return;
    }
    setState(() {
      _showCountdown = true;
      _countdown = 3;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      if (_countdown <= 1) {
        t.cancel();
        setState(() => _showCountdown = false);
        _startCurrentTimer();
      } else {
        setState(() => _countdown -= 1);
        HapticFeedback.selectionClick();
      }
    });
  }

  void _startCurrentTimer() {
    _timer?.cancel();
    if (_items.isEmpty) {
      _finishPhase();
      return;
    }
    final item = _items[_index];
    final seconds = item.durationSeconds as int;
    setState(() => _remaining = seconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      if (_remaining <= 1) {
        t.cancel();
        _completeCurrent(skipped: false);
      } else {
        setState(() => _remaining -= 1);
      }
    });
  }

  void _skipCurrent() {
    HapticFeedback.lightImpact();
    _timer?.cancel();
    _completeCurrent(skipped: true);
  }

  void _completeCurrent({required bool skipped}) {
    final item = _items[_index];
    final id = widget.phase == MobilityPhase.warmup
        ? (item as MeWorkoutWarmupLine).warmupId
        : (item as MeWorkoutStretchLine).stretchId;
    if (!skipped) _completedIds.add(id);
    if (_index >= _items.length - 1) {
      _finishPhase();
      return;
    }
    setState(() => _index += 1);
    _startCountdown();
  }

  Future<void> _finishPhase() async {
    _timer?.cancel();
    if (!mounted) return;

    if (widget.phase == MobilityPhase.warmup && !widget.afterWorkout) {
      await launchLiveWorkoutSession(
        context,
        ref,
        plan: widget.plan,
        template: widget.template,
        warmupsCompleted: _completedIds.length,
      );
      if (mounted) context.pop();
      return;
    }

    if (widget.phase == MobilityPhase.stretch && widget.afterWorkout) {
      final summary = WorkoutFlowSummary(
        warmupsCompleted: widget.warmupsCompleted,
        exercisesCompleted: widget.exercisesCompleted,
        stretchesCompleted: _completedIds.length,
        durationSeconds: widget.workoutDurationSeconds,
        estimatedCalories: widget.plan.durationMinutes,
      );
      if (!mounted) return;
      context.go(
        '/workouts/${widget.plan.id}/summary',
        extra: {'plan': widget.plan, 'summary': summary},
      );
      return;
    }

    if (!mounted) return;
    context.go('/workouts');
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.phase == MobilityPhase.warmup ? 'Warmup' : 'Recovery stretch';
    final items = _items;
    if (items.isEmpty) {
      return CupertinoPageScaffold(
        child: Center(child: Text('No $title items.', style: FitnessText.body(context))),
      );
    }

    final current = items[_index];
    final String name;
    final String? bodyPart;
    final String? instructions;
    if (widget.phase == MobilityPhase.warmup) {
      final w = current as MeWorkoutWarmupLine;
      name = w.name;
      bodyPart = w.bodyPart;
      instructions = w.description;
    } else {
      final s = current as MeWorkoutStretchLine;
      name = s.name;
      bodyPart = s.bodyPart;
      instructions = s.description;
    }
    final total = items.length;
    final progressLabel = '$title ${_index + 1} of $total';

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(ShellLayoutMetrics.horizontalInset),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(progressLabel.toUpperCase(), style: FitnessText.label(context)),
                  const SizedBox(height: AppSpacing.sm),
                  Text(name, style: FitnessText.title(context)),
                  if (bodyPart != null) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Text(bodyPart, style: FitnessText.body(context)),
                  ],
                  if (instructions != null && instructions.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(instructions, style: FitnessText.body(context)),
                  ],
                  const SizedBox(height: AppSpacing.lg),
                  GlassCard(
                    child: Column(
                      children: [
                        if (_showCountdown) ...[
                          Text('Get ready', style: FitnessText.body(context)),
                          const SizedBox(height: AppSpacing.sm),
                          Text(
                            _countdown > 0 ? '$_countdown' : 'Start',
                            style: FitnessText.display(context),
                          ),
                        ] else ...[
                          Text('$_remaining', style: FitnessText.display(context)),
                          Text('seconds remaining', style: FitnessText.body(context)),
                        ],
                        const SizedBox(height: AppSpacing.md),
                        Text(progressLabel, style: FitnessText.chip(context)),
                      ],
                    ),
                  ),
                  const Spacer(),
                  if (!_showCountdown)
                    SizedBox(
                      width: double.infinity,
                      child: CupertinoButton.filled(
                        onPressed: () => _completeCurrent(skipped: false),
                        child: Text(_index >= total - 1 ? 'Finish $title' : 'Next'),
                      ),
                    ),
                  if (!_showCountdown)
                    CupertinoButton(
                      onPressed: _skipCurrent,
                      child: const Text('Skip'),
                    ),
                  CupertinoButton(
                    onPressed: () => context.pop(),
                    child: const Text('Exit'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
