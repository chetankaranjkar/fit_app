import 'package:flutter/cupertino.dart';

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
    bool useGradient = false;

    switch (style) {
      case AppButtonStyle.primary:
        useGradient = true;
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
        ? const CupertinoActivityIndicator(color: CupertinoColors.white, radius: 11)
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, color: foreground, size: 18),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: AppType.button.copyWith(color: foreground),
              ),
            ],
          );

    return PressScale(
      onTap: disabled ? null : onTap,
      child: AnimatedContainer(
        duration: AppMotion.fast,
        height: 54,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          gradient: (useGradient && !disabled) ? AppColors.primaryGradient : null,
          color: useGradient
              ? (disabled ? AppColors.accent.withValues(alpha: 0.45) : null)
              : (disabled
                  ? solidBg.withValues(alpha: 0.55)
                  : solidBg),
          boxShadow: (useGradient && !disabled)
              ? [
                  BoxShadow(
                    color: AppColors.accent.withValues(alpha: 0.45),
                    blurRadius: 20,
                    offset: const Offset(0, 6),
                  ),
                ]
              : null,
        ),
        child: Center(child: content),
      ),
    );
  }
}
