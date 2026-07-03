import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../services/me_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/apple_grouped_list.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/premium_background.dart';

class NotificationPreferencesScreen extends ConsumerStatefulWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  ConsumerState<NotificationPreferencesScreen> createState() =>
      _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState extends ConsumerState<NotificationPreferencesScreen> {
  bool _saving = false;

  Future<void> _save(MeNotificationPreferences current, {
    bool? receiveEmail,
    bool? receiveSms,
  }) async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      await MeService.instance.updateNotificationPreferences(
        receiveEmailNotifications: receiveEmail ?? current.receiveEmailNotifications,
        receiveSmsNotifications: receiveSms ?? current.receiveSmsNotifications,
      );
      ref.invalidate(notificationPreferencesProvider);
      if (mounted) {
        HapticFeedback.lightImpact();
      }
    } catch (e) {
      if (mounted) {
        await showCupertinoDialog<void>(
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
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final prefs = ref.watch(notificationPreferencesProvider);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Notifications'),
        leading: CupertinoNavigationBarBackButton(
          onPressed: () => context.pop(),
        ),
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: prefs.when(
              loading: () => const Center(child: CupertinoActivityIndicator()),
              error: (e, _) => ErrorStateView(
                message: e.toString(),
                onRetry: () => ref.invalidate(notificationPreferencesProvider),
              ),
              data: (p) => ListView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                children: [
                  Text(
                    'Choose how the gym may contact you. These are off by default — turn on only what you want.',
                    style: AppType.footnote.copyWith(
                      color: AppColors.resolveTextSecondary(context),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  AppleGroupedSection(
                    header: 'Email',
                    children: [
                      _PrefSwitchRow(
                        label: 'Receive email',
                        subtitle: 'Payment receipts and membership renewal reminders',
                        value: p.receiveEmailNotifications,
                        enabled: !_saving,
                        onChanged: (v) => _save(p, receiveEmail: v),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  AppleGroupedSection(
                    header: 'SMS / WhatsApp',
                    children: [
                      _PrefSwitchRow(
                        label: 'Receive SMS / WhatsApp',
                        subtitle: 'Text alerts when your gym has messaging enabled',
                        value: p.receiveSmsNotifications,
                        enabled: !_saving,
                        onChanged: (v) => _save(p, receiveSms: v),
                      ),
                    ],
                  ),
                  if (_saving) ...[
                    const SizedBox(height: AppSpacing.md),
                    const Center(child: CupertinoActivityIndicator()),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PrefSwitchRow extends StatelessWidget {
  const _PrefSwitchRow({
    required this.label,
    required this.subtitle,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final String label;
  final String subtitle;
  final bool value;
  final bool enabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: AppType.body.copyWith(color: AppColors.resolveText(context)),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: AppType.caption1.copyWith(
                    color: AppColors.resolveTextSecondary(context),
                  ),
                ),
              ],
            ),
          ),
          CupertinoSwitch(
            value: value,
            onChanged: enabled ? onChanged : null,
          ),
        ],
      ),
    );
  }
}
