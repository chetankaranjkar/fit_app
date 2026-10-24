import 'package:flutter/cupertino.dart';
import '../theme/app_colors.dart';

/// A quiet canvas keeps actions and member information in focus.
class PremiumBackground extends StatelessWidget {
  const PremiumBackground({super.key});
  @override
  Widget build(BuildContext context) =>
      ColoredBox(color: AppColors.resolveBg(context));
}
