import 'dart:math' as math;

import 'package:flutter/cupertino.dart';

import '../theme/app_a11y.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../theme/app_typography.dart';
import 'press_scale.dart';

enum AppButtonStyle { primary, secondary, plain, danger }

class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    this.onTap,
    this.style = AppButtonStyle.primary,
    this.isLoading = false,
    this.icon,
  });

  final String label;
  final VoidCallback? onTap;
  final AppButtonStyle style;
  final bool isLoading;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final disabled = onTap == null || isLoading;

    Color? solidBg;
    Color foreground;

    switch (style) {
      case AppButtonStyle.primary:
        foreground = CupertinoColors.white;
        solidBg = AppColors.accent;
        break;
      case AppButtonStyle.secondary:
        solidBg = isDark ? AppColors.surfaceDarkAlt : const Color(0xFFEDE8E3);
        foreground = isDark ? CupertinoColors.white : AppColors.textLight;
        break;
      case AppButtonStyle.plain:
        solidBg = CupertinoColors.transparent;
        foreground = AppColors.accent;
        break;
      case AppButtonStyle.danger:
        solidBg = AppColors.danger;
        foreground = CupertinoColors.white;
        break;
    }

    final content = isLoading
        ? const CupertinoActivityIndicator(
            color: CupertinoColors.white, radius: 11)
        : Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, color: foreground, size: 18),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  maxLines: AppA11y.isLargeText(context) ? 3 : 2,
                  overflow: TextOverflow.ellipsis,
                  style: AppA11y.applyTextStyle(
                    context,
                    AppType.button.copyWith(color: foreground),
                  ),
                ),
              ),
            ],
          );

    final scale = MediaQuery.textScalerOf(context).scale(16) / 16;
    final minH =
        math.max(AppA11y.minTouchTarget, 54.0 * (scale > 1.2 ? 1.1 : 1.0));

    return Semantics(
      button: true,
      enabled: !disabled,
      label: label,
      child: PressScale(
        onTap: disabled ? null : onTap,
        child: AnimatedContainer(
          duration: AppA11y.motion(context, AppMotion.fast),
          constraints: BoxConstraints(minHeight: minH),
          padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xl, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            color: disabled ? solidBg.withValues(alpha: 0.45) : solidBg,
          ),
          child: Center(child: content),
        ),
      ),
    );
  }
}
