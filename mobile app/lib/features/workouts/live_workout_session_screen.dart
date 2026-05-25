import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_exception.dart';
import '../../models/workout_tracking_models.dart';
import '../../providers/me_providers.dart';
import '../../providers/workout_tracking_providers.dart';
import '../../services/workout_tracking_repository.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/app_button.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import 'widgets/exercise_history_sheet.dart';

/// Live set-by-set workout logging with offline persistence + auto-sync.
class LiveWorkoutSessionScreen extends ConsumerStatefulWidget {
  const LiveWorkoutSessionScreen({super.key, this.initialSession});

  final ActiveWorkoutSession? initialSession;

  @override
  ConsumerState<LiveWorkoutSessionScreen> createState() => _LiveWorkoutSessionScreenState();
}

class _LiveWorkoutSessionScreenState extends ConsumerState<LiveWorkoutSessionScreen> {
  final _repo = WorkoutTrackingRepository.instance;
  ActiveWorkoutSession? _session;
  bool _loading = true;
  bool _completing = false;
  int? _savingSetId;
  Timer? _timer;
  int _elapsedSec = 0;

  @override
  void initState() {
    super.initState();
    _session = widget.initialSession;
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    if (_session != null) {
      _startTimer(_session!.startTimeUtc);
      setState(() => _loading = false);
      return;
    }
    try {
      final memberId = await ref.read(memberIdProvider.future);
      final active = await _repo.getActive(memberId);
      if (!mounted) return;
      setState(() {
        _session = active;
        _loading = false;
      });
      if (active?.startTimeUtc != null) _startTimer(active!.startTimeUtc);
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _startTimer(DateTime? startUtc) {
    _timer?.cancel();
    if (startUtc == null) return;
    void tick() {
      setState(() {
        _elapsedSec = DateTime.now().difference(startUtc.toLocal()).inSeconds.clamp(0, 99999);
      });
    }
    tick();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => tick());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _formatElapsed(int sec) {
    final m = sec ~/ 60;
    final s = sec % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  Future<void> _reload() async {
    final current = _session;
    if (current == null) return;
    final updated = await _repo.reloadSession(current);
    if (!mounted || updated == null) return;
    setState(() => _session = updated);
  }

  Future<void> _saveSet(TrackedWorkoutSet set, String weight, String reps, bool done) async {
    final session = _session;
    if (session == null) return;
    setState(() => _savingSetId = set.id);
    try {
      await _repo.logSet(
        session: session,
        workoutSessionExerciseId: set.id,
        actualWeight: weight.trim().isEmpty ? null : double.tryParse(weight.trim()),
        actualReps: reps.trim().isEmpty ? null : int.tryParse(reps.trim()),
        isCompleted: done,
      );
      HapticFeedback.lightImpact();
      await _reload();
      if (!mounted) return;
      if (session.isOffline) {
        _toast('Saved on device', 'Will sync when you\'re back online.');
      }
      ref.invalidate(workoutTrackingDashboardProvider);
      ref.invalidate(workoutSessionHistoryProvider);
      ref.invalidate(activeWorkoutProvider);
    } on ApiException catch (e) {
      if (!mounted) return;
      _alert('Could not save set', e.message);
    } finally {
      if (mounted) setState(() => _savingSetId = null);
    }
  }

  Future<void> _complete() async {
    final session = _session;
    if (session == null) return;
    setState(() => _completing = true);
    try {
      final result = await _repo.complete(session);
      HapticFeedback.heavyImpact();
      ref.invalidate(activeWorkoutProvider);
      ref.invalidate(workoutTrackingDashboardProvider);
      ref.invalidate(workoutSessionHistoryProvider);
      if (!mounted) return;
      context.pop();
      if (result.isOffline && result.pendingCompleteSync) {
        await showCupertinoDialog<void>(
          context: context,
          builder: (ctx) => CupertinoAlertDialog(
            title: const Text('Saved offline'),
            content: const Text(
              'Your workout is stored on this device and will upload automatically when you open the app online.',
            ),
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
      await showCupertinoDialog<void>(
        context: context,
        builder: (ctx) => CupertinoAlertDialog(
          title: const Text('Workout complete'),
          content: Text(
            '${result.completedSets} of ${result.totalSets} sets logged.',
          ),
          actions: [
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Great'),
            ),
          ],
        ),
      );
    } on ApiException catch (e) {
      _alert('Could not complete', e.message);
    } finally {
      if (mounted) setState(() => _completing = false);
    }
  }

  void _toast(String title, String message) {
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

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const CupertinoPageScaffold(
        child: Center(child: CupertinoActivityIndicator(radius: 14)),
      );
    }

    final session = _session;
    if (session == null) {
      return CupertinoPageScaffold(
        navigationBar: const CupertinoNavigationBar(middle: Text('Workout')),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('No active workout'),
                const SizedBox(height: AppSpacing.md),
                CupertinoButton.filled(
                  onPressed: () => context.go('/workouts'),
                  child: const Text('Back to workouts'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final pct = session.completionPercent.clamp(0, 100);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      navigationBar: CupertinoNavigationBar(
        middle: Text(session.planName ?? 'Live workout'),
        border: null,
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: _completing ? null : () => context.pop(),
          child: const Text('Close'),
        ),
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          Column(
            children: [
              if (session.isOffline)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 8),
                  color: AppColors.accent.withValues(alpha: 0.2),
                  child: Row(
                    children: [
                      const Icon(CupertinoIcons.wifi_slash, size: 16, color: AppColors.accent),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Offline mode — data saves on this device and syncs when online.',
                          style: AppType.footnote.copyWith(color: AppColors.accent),
                        ),
                      ),
                    ],
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 0),
                child: GlassCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${session.completedSets} / ${session.totalSets} sets',
                            style: AppType.body.copyWith(
                              color: AppColors.resolveText(context),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Row(
                            children: [
                              const Icon(CupertinoIcons.timer, size: 16, color: AppColors.neonCyan),
                              const SizedBox(width: 4),
                              Text(
                                _formatElapsed(_elapsedSec),
                                style: AppType.footnote.copyWith(color: AppColors.neonCyan),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: SizedBox(
                          height: 8,
                          child: Stack(
                            children: [
                              Container(color: AppColors.borderDark.withValues(alpha: 0.5)),
                              FractionallySizedBox(
                                widthFactor: (pct / 100).clamp(0.0, 1.0),
                                child: Container(color: AppColors.accent),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${pct.round()}% · ${session.totalVolume.round()} kg volume',
                        style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
                      ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.md,
                    AppSpacing.lg,
                    100,
                  ),
                  children: [
                    for (final group in session.exercises) ...[
                      _ExerciseBlock(
                        group: group,
                        memberId: session.memberId,
                        savingSetId: _savingSetId,
                        onSave: _saveSet,
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ],
                  ],
                ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.md),
                  child: AppButton(
                    label: _completing ? 'Finishing…' : 'Complete workout',
                    onTap: _completing ? null : _complete,
                    isLoading: _completing,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ExerciseBlock extends StatelessWidget {
  const _ExerciseBlock({
    required this.group,
    required this.memberId,
    required this.savingSetId,
    required this.onSave,
  });

  final WorkoutExerciseGroup group;
  final int memberId;
  final int? savingSetId;
  final Future<void> Function(TrackedWorkoutSet set, String weight, String reps, bool done) onSave;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  group.exerciseName,
                  style: AppType.title3.copyWith(
                    color: AppColors.resolveText(context),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              CupertinoButton(
                padding: EdgeInsets.zero,
                minimumSize: const Size(28, 28),
                onPressed: () => ExerciseHistorySheet.show(
                  context,
                  memberId: memberId,
                  exerciseId: group.exerciseId,
                  exerciseName: group.exerciseName,
                ),
                child: const Icon(CupertinoIcons.time, size: 20),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          for (final set in group.sets)
            _SetRow(
              set: set,
              saving: savingSetId == set.id,
              onSave: onSave,
            ),
        ],
      ),
    );
  }
}

class _SetRow extends StatefulWidget {
  const _SetRow({
    required this.set,
    required this.saving,
    required this.onSave,
  });

  final TrackedWorkoutSet set;
  final bool saving;
  final Future<void> Function(TrackedWorkoutSet set, String weight, String reps, bool done) onSave;

  @override
  State<_SetRow> createState() => _SetRowState();
}

class _SetRowState extends State<_SetRow> {
  late final TextEditingController _weight;
  late final TextEditingController _reps;
  late bool _done;

  @override
  void initState() {
    super.initState();
    final s = widget.set;
    _weight = TextEditingController(
      text: _fmt(s.actualWeight ?? s.targetWeight),
    );
    _reps = TextEditingController(
      text: '${s.actualReps ?? s.targetReps}',
    );
    _done = s.isCompleted;
  }

  @override
  void dispose() {
    _weight.dispose();
    _reps.dispose();
    super.dispose();
  }

  String _fmt(double? v) {
    if (v == null || v <= 0) return '';
    if (v == v.roundToDouble()) return '${v.round()}';
    return v.toStringAsFixed(1);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          SizedBox(
            width: 44,
            child: Text(
              'S${widget.set.setNumber}',
              style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
            ),
          ),
          Expanded(
            child: CupertinoTextField(
              controller: _weight,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              placeholder: 'kg',
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.bgDark.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.borderDark.withValues(alpha: 0.5)),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: CupertinoTextField(
              controller: _reps,
              keyboardType: TextInputType.number,
              placeholder: 'reps',
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.bgDark.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.borderDark.withValues(alpha: 0.5)),
              ),
            ),
          ),
          CupertinoCheckbox(
            value: _done,
            onChanged: (v) => setState(() => _done = v ?? false),
          ),
          CupertinoButton(
            padding: const EdgeInsets.only(left: 4),
            minimumSize: const Size(32, 32),
            onPressed: widget.saving
                ? null
                : () => widget.onSave(widget.set, _weight.text, _reps.text, _done),
            child: widget.saving
                ? const CupertinoActivityIndicator(radius: 9)
                : const Icon(CupertinoIcons.checkmark_alt, size: 22),
          ),
        ],
      ),
    );
  }
}
