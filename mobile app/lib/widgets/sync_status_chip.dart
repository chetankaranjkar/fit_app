import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/sync_status_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../workout_sync/models/workout_sync_enums.dart';
import '../workout_sync/sync/sync_manager.dart';

/// Green = synced · orange = pending/offline · red = failed · gray = offline device.
class SyncStatusChip extends ConsumerWidget {
  const SyncStatusChip({super.key, this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(syncStatusProvider);

    return async.when(
      loading: () => const _ChipSkeleton(),
      error: (_, __) => const SizedBox.shrink(),
      data: (status) => _SyncChip(status: status, compact: compact),
    );
  }
}

class _SyncChip extends StatelessWidget {
  const _SyncChip({required this.status, required this.compact});

  final AppSyncSnapshot status;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final color = _color(context);
    final label = _label(status);
    final icon = _icon(status);

    return Semantics(
      label: 'Sync: $label',
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: compact ? 8 : 10,
          vertical: compact ? 4 : 5,
        ),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.45)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (status.isSyncing)
              Padding(
                padding: const EdgeInsets.only(right: 5),
                child: CupertinoActivityIndicator(radius: compact ? 6 : 7, color: color),
              )
            else
              Icon(icon, size: compact ? 12 : 14, color: color),
            if (!compact) ...[
              const SizedBox(width: 5),
              Text(
                label,
                style: AppType.caption.copyWith(
                  color: color,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            if (status.pendingCount > 0 && !compact) ...[
              const SizedBox(width: 4),
              Text(
                '${status.pendingCount}',
                style: AppType.caption.copyWith(
                  color: color,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _color(BuildContext context) {
    switch (status.displayState) {
      case WorkoutSyncDisplayState.synced:
        return AppColors.success;
      case WorkoutSyncDisplayState.pending:
        return AppColors.accent;
      case WorkoutSyncDisplayState.offline:
        return AppColors.resolveTextSecondary(context);
      case WorkoutSyncDisplayState.failed:
        return AppColors.danger;
    }
  }

  String _label(AppSyncSnapshot s) {
    if (s.isSyncing) return 'Syncing';
    switch (s.displayState) {
      case WorkoutSyncDisplayState.synced:
        return 'Synced';
      case WorkoutSyncDisplayState.pending:
        return s.pendingCount > 0 ? 'Pending' : 'Pending';
      case WorkoutSyncDisplayState.offline:
        return 'Offline';
      case WorkoutSyncDisplayState.failed:
        return s.failedCount > 0 ? 'Failed' : 'No server';
    }
  }

  IconData _icon(AppSyncSnapshot s) {
    switch (s.displayState) {
      case WorkoutSyncDisplayState.synced:
        return CupertinoIcons.checkmark_circle_fill;
      case WorkoutSyncDisplayState.pending:
        return CupertinoIcons.arrow_2_circlepath;
      case WorkoutSyncDisplayState.offline:
        return CupertinoIcons.wifi_slash;
      case WorkoutSyncDisplayState.failed:
        return CupertinoIcons.exclamationmark_triangle_fill;
    }
  }
}

class _ChipSkeleton extends StatelessWidget {
  const _ChipSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 72,
      height: 26,
      decoration: BoxDecoration(
        color: AppColors.borderDark.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(20),
      ),
    );
  }
}
