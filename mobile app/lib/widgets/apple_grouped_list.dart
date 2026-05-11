import 'package:flutter/cupertino.dart';

import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../theme/app_typography.dart';

/// iOS Settings�style grouped section: inset card, hairline separators, first/last rounded corners per row cluster.
class AppleGroupedSection extends StatelessWidget {
  const AppleGroupedSection({
    super.key,
    this.header,
    this.footer,
    required this.children,
  }) : assert(children.length > 0);

  final String? header;
  final String? footer;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final footerText = footer;
    final headerText = header;
    final borderColor = AppColors.resolveBorder(context);
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final surface = (isDark ? AppColors.surfaceDark : AppColors.surfaceLight).withValues(alpha: 0.96);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (headerText != null) ...[
          Padding(
            padding: const EdgeInsets.only(left: AppSpacing.sm, bottom: AppSpacing.sm),
            child: Text(
              headerText.toUpperCase(),
              style: AppType.caption.copyWith(
                color: AppColors.resolveTextSecondary(context),
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ],
        Container(
          decoration: BoxDecoration(
            color: surface,
            borderRadius: BorderRadius.circular(AppRadius.md + 2),
            border: Border.all(
              color: borderColor.withValues(alpha: isDark ? 0.45 : 0.65),
              width: 0.5,
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              for (var i = 0; i < children.length; i++) ...[
                if (i > 0)
                  Container(height: 0.5, color: borderColor.withValues(alpha: 0.85)),
                children[i],
              ],
            ],
          ),
        ),
        if (footerText != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
            child: Text(
              footerText,
              style: AppType.footnote.copyWith(
                color: AppColors.resolveTextSecondary(context),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
