import 'package:flutter/cupertino.dart';

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
          child: Text(
            title,
            style: AppType.title3.copyWith(
              color: AppColors.resolveText(context),
              letterSpacing: -0.35,
            ),
          ),
        ),
        if (action != null)
          CupertinoButton(
            padding: EdgeInsets.zero,
            onPressed: onActionTap,
            child: Text(
              action!,
              style: AppType.callout.copyWith(color: AppColors.accent),
            ),
          ),
      ],
    );
  }
}
