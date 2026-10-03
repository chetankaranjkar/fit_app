import 'package:flutter/cupertino.dart';

import '../theme/app_a11y.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    this.action,
    this.onActionTap,
  });

  final String title;
  final String? action;
  final VoidCallback? onActionTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: AppText(
            title,
            style: AppType.title3.copyWith(
              color: AppColors.resolveText(context),
              letterSpacing: -0.35,
            ),
            maxLines: 2,
          ),
        ),
        if (action != null)
          ConstrainedBox(
            constraints: const BoxConstraints(minHeight: AppA11y.minTouchTarget),
            child: CupertinoButton(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              onPressed: onActionTap,
              child: AppText(
                action!,
                style: AppType.callout.copyWith(color: AppColors.accent),
                maxLines: 2,
              ),
            ),
          ),
      ],
    );
  }
}
