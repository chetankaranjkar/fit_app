import 'package:flutter/cupertino.dart';
import 'package:shimmer/shimmer.dart';

import '../theme/app_colors.dart';

class SkeletonBlock extends StatelessWidget {
  const SkeletonBlock({
    super.key,
    this.height = 16,
    this.width = double.infinity,
    this.radius = 8,
  });

  final double height;
  final double width;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? AppColors.surfaceDarkAlt : AppColors.surfaceLightAlt,
      highlightColor: (isDark ? AppColors.surfaceDarkAlt : AppColors.surfaceLightAlt)
          .withValues(alpha: 0.6),
      period: const Duration(milliseconds: 1300),
      child: Container(
        height: height,
        width: width,
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDarkAlt : AppColors.surfaceLightAlt,
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );
  }
}
