import 'package:flutter/cupertino.dart';
import 'app_colors.dart';
import 'app_typography.dart';

/// Spacing scale (multiples of 4).
class AppSpacing {
  AppSpacing._();
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;
}

/// Radius scale.
class AppRadius {
  AppRadius._();
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 28;
  static const double pill = 999;
}

/// Motion durations.
class AppMotion {
  AppMotion._();
  static const Duration fast = Duration(milliseconds: 180);
  static const Duration medium = Duration(milliseconds: 320);
  static const Duration slow = Duration(milliseconds: 520);
  static const Curve easeOut = Curves.easeOutCubic;
}

CupertinoThemeData buildCupertinoTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  return CupertinoThemeData(
    brightness: brightness,
    primaryColor: AppColors.accent,
    scaffoldBackgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
    barBackgroundColor: (isDark ? AppColors.bgDark : AppColors.bgLight).withValues(alpha: 0.85),
    textTheme: CupertinoTextThemeData(
      primaryColor: AppColors.accent,
      textStyle: AppType.body.copyWith(
        color: isDark ? AppColors.textDark : AppColors.textLight,
      ),
      navTitleTextStyle: AppType.headline.copyWith(
        color: isDark ? AppColors.textDark : AppColors.textLight,
      ),
      navLargeTitleTextStyle: AppType.largeTitle.copyWith(
        color: isDark ? AppColors.textDark : AppColors.textLight,
      ),
      tabLabelTextStyle: AppType.caption.copyWith(
        color: isDark ? AppColors.textDarkSecondary : AppColors.textLightSecondary,
      ),
      actionTextStyle: AppType.button.copyWith(color: AppColors.accent),
      pickerTextStyle: AppType.body.copyWith(
        color: isDark ? AppColors.textDark : AppColors.textLight,
      ),
      dateTimePickerTextStyle: AppType.body.copyWith(
        color: isDark ? AppColors.textDark : AppColors.textLight,
      ),
    ),
  );
}
