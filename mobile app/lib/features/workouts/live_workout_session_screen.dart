import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_exception.dart';
import '../../models/workout_tracking_models.dart';
import '../../providers/me_providers.dart';
import '../../providers/sync_status_provider.dart';
import '../../providers/workout_tracking_providers.dart';
import '../../services/workout_tracking_repository.dart';
import '../../widgets/sync_status_chip.dart';
import '../../workout_sync/models/workout_sync_enums.dart';
import '../../workout_sync/sync/session_autosave_service.dart';
import '../../workout_sync/sync/sync_manager.dart';
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
  int _currentExerciseIndex = 0;
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _session = widget.initialSession;
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    try {
      final memberId = await ref.read(memberIdProvider.future);
      final snap = await _repo.restoreSnapshot(memberId);
      var session = _session ?? snap?.session ?? await _repo.getActive(memberId);
      if (session != null) {
        session = await _repo.reloadSession(session) ?? session;
      }
      if (!mounted) return;
      final elapsed = snap?.elapsedSeconds;
      setState(() {
        _session = session;
        _loading = false;
        _currentExerciseIndex = snap?.currentExerciseIndex ?? 0;
        if (elapsed != null && elapsed > 0) {
          _elapsedSec = elapsed;
        }
      });
      if (session?.startTimeUtc != null) {
        _startTimer(session!.startTimeUtc, preserveElapsed: elapsed != null && elapsed > 0);
      }
      final offset = snap?.scrollOffset ?? 0;
      if (offset > 0) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scrollController.hasClients) {
            _scrollController.jumpTo(offset);
          }
        });
      }
      _bindAutosave();
      unawaited(SyncManager.instance.syncAll(reason: 'live-open'));
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _bindAutosave() {
    SessionAutosaveService.instance.bind(
      readSession: () => _session,
      readElapsedSeconds: () => _elapsedSec,
      readExerciseIndex: () => _currentExerciseIndex,
      readScrollOffset: () =>
          _scrollController.hasClients ? _scrollController.offset : 0,
    );
  }

  void _startTimer(DateTime? startUtc, {bool preserveElapsed = false}) {
    _timer?.cancel();
    if (startUtc == null) return;
    if (!preserveElapsed) {
      _elapsedSec = DateTime.now().difference(startUtc.toLocal()).inSeconds.clamp(0, 99999);
    }
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        _elapsedSec = DateTime.now().difference(startUtc.toLocal()).inSeconds.clamp(0, 99999);
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    SessionAutosaveService.instance.stop();
    _scrollController.dispose();
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
      invalidateSyncStatus(ref);
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
      invalidateSyncStatus(ref);
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
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SyncStatusChip(compact: true),
            CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: _completing ? null : () => context.pop(),
              child: const Text('Close'),
            ),
          ],
        ),
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          Column(
            children: [
              _WorkoutSyncBanner(session: session),
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
                  controller: _scrollController,
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.md,
                    AppSpacing.lg,
                    100,
                  ),
                  children: [
                    for (var i = 0; i < session.exercises.length; i++) ...[
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: _ExerciseBlock(
                          group: session.exercises[i],
                          memberId: session.memberId,
                          savingSetId: _savingSetId,
                          onSave: (set, w, r, d) {
                            setState(() => _currentExerciseIndex = i);
                            return _saveSet(set, w, r, d);
                          },
                        ),
                      ),
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

class _WorkoutSyncBanner extends ConsumerWidget {
  const _WorkoutSyncBanner({required this.session});

  final ActiveWorkoutSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sync = ref.watch(syncStatusProvider);
    return sync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (status) {
        if (!session.isOffline && status.displayState == WorkoutSyncDisplayState.synced) {
          return const SizedBox.shrink();
        }
        final color = session.isOffline || status.displayState == WorkoutSyncDisplayState.offline
            ? AppColors.accent
            : AppColors.danger;
        final message = session.isOffline
            ? 'Offline — sets save on this device (${status.pendingCount} pending upload).'
            : status.isSyncing
                ? 'Syncing your workout…'
                : 'Sync pending — ${status.pendingCount} item(s) waiting to upload.';
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 8),
          color: color.withValues(alpha: 0.2),
          child: Row(
            children: [
              if (status.isSyncing)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: CupertinoActivityIndicator(radius: 8, color: color),
                )
              else
                Icon(
                  session.isOffline ? CupertinoIcons.wifi_slash : CupertinoIcons.arrow_2_circlepath,
                  size: 16,
                  color: color,
                ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(message, style: AppType.footnote.copyWith(color: color)),
              ),
            ],
          ),
        );
      },
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
