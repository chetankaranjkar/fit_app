import 'dart:ui';
import 'package:flutter/cupertino.dart';

import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

/// Frosted-glass surface — deeper, richer dark tones for the gym aesthetic.
class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.radius = AppRadius.xl,
    this.tint,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;

    final base = tint ??
        (isDark
            ? AppColors.surfaceDark.withValues(alpha: 0.74)
            : AppColors.surfaceLight.withValues(alpha: 0.84));

    final border = isDark
        ? AppColors.borderDark.withValues(alpha: 0.5)
        : AppColors.borderLight.withValues(alpha: 0.72);

    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 32, sigmaY: 32),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: base,
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(color: border, width: 0.6),
            boxShadow: isDark
                ? [
                    BoxShadow(
                      color: const Color(0xFF000000).withValues(alpha: 0.36),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                  ]
                : null,
          ),
          child: child,
        ),
      ),
    );
  }
}
