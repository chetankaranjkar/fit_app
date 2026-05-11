import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../animations/app_motion.dart';
import '../theme/app_colors.dart';

class PremiumBackground extends StatelessWidget {
  const PremiumBackground({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    return Stack(
      fit: StackFit.expand,
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: isDark
                ? const LinearGradient(
                    colors: [Color(0xFF050510), Color(0xFF0B0B1A), Color(0xFF050510)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : const LinearGradient(
                    colors: [Color(0xFFF8F4EE), Color(0xFFFFF8F1)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
          ),
        ),
        const Positioned(top: -90, right: -70, child: _AmbientBlob(color: AppColors.neonPurple, size: 220)),
        const Positioned(top: 140, left: -80, child: _AmbientBlob(color: AppColors.neonBlue, size: 200)),
        const Positioned(bottom: -80, right: -60, child: _AmbientBlob(color: AppColors.accent, size: 230)),
      ],
    );
  }
}

class _AmbientBlob extends StatelessWidget {
  const _AmbientBlob({required this.color, required this.size});

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [color.withValues(alpha: 0.18), color.withValues(alpha: 0)],
          ),
        ),
      )
          .animate(onPlay: (c) => c.repeat(reverse: true))
          .moveY(begin: -10, end: 12, duration: AppFx.ambient, curve: AppFx.ambientCurve)
          .scaleXY(begin: 0.95, end: 1.04, duration: AppFx.ambient, curve: AppFx.ambientCurve),
    );
  }
}

