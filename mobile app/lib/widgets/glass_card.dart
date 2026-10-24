import 'package:flutter/cupertino.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

/// Shared solid card. The legacy name keeps existing feature callers compatible.
class GlassCard extends StatelessWidget {
  const GlassCard(
      {super.key,
      required this.child,
      this.padding = const EdgeInsets.all(AppSpacing.lg),
      this.radius = AppRadius.lg,
      this.tint});
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color? tint;
  @override
  Widget build(BuildContext context) {
    final surface = AppColors.resolveSurface(context);
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: tint == null ? surface : Color.alphaBlend(tint!, surface),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: AppColors.resolveBorder(context), width: 0.7),
      ),
      child: child,
    );
  }
}
