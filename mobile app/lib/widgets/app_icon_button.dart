import 'package:flutter/cupertino.dart';

import '../theme/app_a11y.dart';
import '../theme/app_colors.dart';

/// Icon-only control with a 48dp target and a screen-reader label.
class AppIconButton extends StatelessWidget {
  const AppIconButton({
    super.key,
    required this.icon,
    required this.semanticLabel,
    required this.onPressed,
    this.color,
    this.size = 22,
  });

  final IconData icon;
  final String semanticLabel;
  final VoidCallback? onPressed;
  final Color? color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: onPressed != null,
      label: semanticLabel,
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          minWidth: AppA11y.minTouchTarget,
          minHeight: AppA11y.minTouchTarget,
        ),
        child: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: onPressed,
          child: Icon(
            icon,
            size: size,
            color: color ?? AppColors.resolveText(context),
            semanticLabel: semanticLabel,
          ),
        ),
      ),
    );
  }
}
