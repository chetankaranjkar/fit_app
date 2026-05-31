import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/device_security_models.dart';
import '../../providers/auth_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/press_scale.dart';

/// Shown when the account already has the maximum number of active devices.
class DeviceLimitSheet extends ConsumerStatefulWidget {
  const DeviceLimitSheet({
    super.key,
    required this.limit,
    required this.identifier,
    required this.password,
  });

  final DeviceLimitInfo limit;
  final String identifier;
  final String password;

  @override
  ConsumerState<DeviceLimitSheet> createState() => _DeviceLimitSheetState();
}

class _DeviceLimitSheetState extends ConsumerState<DeviceLimitSheet> {
  int? _selectedDeviceId;
  bool _submitting = false;
  String? _error;

  Future<void> _continue() async {
    final deviceId = _selectedDeviceId;
    if (deviceId == null) {
      setState(() => _error = 'Select a device to remove');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    HapticFeedback.selectionClick();

    try {
      await ref.read(authControllerProvider.notifier).loginWithDeviceReplacement(
            widget.identifier,
            widget.password,
            deviceId,
          );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.resolveBg(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        top: AppSpacing.lg,
        bottom: MediaQuery.viewInsetsOf(context).bottom + AppSpacing.xl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.resolveTextSecondary(context).withValues(alpha: 0.35),
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Device limit reached',
            style: AppType.title3.copyWith(color: AppColors.resolveText(context)),
          ),
          const SizedBox(height: 8),
          Text(
            widget.limit.message,
            style: AppType.subhead.copyWith(color: AppColors.resolveTextSecondary(context)),
          ),
          const SizedBox(height: AppSpacing.lg),
          ...widget.limit.activeDevices.map((device) {
            final selected = _selectedDeviceId == device.deviceId;
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: PressScale(
                onTap: () => setState(() => _selectedDeviceId = device.deviceId),
                child: GlassCard(
                  tint: selected ? AppColors.neonBlue.withValues(alpha: 0.12) : null,
                  child: Row(
                    children: [
                      Icon(
                        selected
                            ? CupertinoIcons.checkmark_circle_fill
                            : CupertinoIcons.circle,
                        color: selected ? AppColors.neonBlueLite : AppColors.resolveTextSecondary(context),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              device.displayName,
                              style: AppType.body.copyWith(color: AppColors.resolveText(context)),
                            ),
                            Text(
                              'Last active: ${device.lastActiveLabel}',
                              style: AppType.footnote.copyWith(
                                color: AppColors.resolveTextSecondary(context),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: AppType.footnote.copyWith(color: AppColors.danger)),
          ],
          const SizedBox(height: AppSpacing.lg),
          CupertinoButton.filled(
            onPressed: _submitting ? null : _continue,
            child: _submitting
                ? const CupertinoActivityIndicator()
                : const Text('Remove selected & continue'),
          ),
          CupertinoButton(
            onPressed: _submitting ? null : () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }
}
