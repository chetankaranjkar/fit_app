import 'package:flutter/cupertino.dart';

import '../../core/formatters.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import 'notification_destination.dart';

class NotificationDetailScreen extends StatelessWidget {
  const NotificationDetailScreen({super.key, required this.args});

  final NotificationDetailArgs args;

  @override
  Widget build(BuildContext context) {
    final when = args.createdAt?.toLocal();
    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Notification'),
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [
                GlassCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        args.title.isEmpty ? 'Update' : args.title,
                        style: AppType.headline.copyWith(
                          color: AppColors.resolveText(context),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        args.body.isEmpty ? 'No additional details.' : args.body,
                        style: AppType.body.copyWith(
                          color: AppColors.resolveTextSecondary(context),
                          height: 1.4,
                        ),
                      ),
                      if (when != null) ...[
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          Fmt.date(when),
                          style: AppType.caption.copyWith(
                            color: AppColors.resolveTextSecondary(context),
                          ),
                        ),
                      ],
                      if (args.type != null && args.type!.trim().isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          args.type!.trim(),
                          style: AppType.caption.copyWith(
                            color: AppColors.resolveTextSecondary(context),
                          ),
                        ),
                      ],
                    ],
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
