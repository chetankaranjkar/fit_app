import 'dart:math' as math;

import 'package:flutter/cupertino.dart';

import '../../../theme/app_colors.dart';

/// Static specks over the workout hero. Kept still so the tab does not repaint every frame.
class WorkoutParticleField extends StatelessWidget {
  const WorkoutParticleField({super.key, this.count = 14});

  final int count;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _ParticlesPainter(
        count: count,
        isDark: CupertinoTheme.of(context).brightness == Brightness.dark,
      ),
      size: Size.infinite,
    );
  }
}

class _ParticlesPainter extends CustomPainter {
  _ParticlesPainter({
    required this.count,
    required this.isDark,
  });

  final int count;
  final bool isDark;

  @override
  void paint(Canvas canvas, Size size) {
    final rnd = math.Random(42);
    for (var i = 0; i < count; i++) {
      final x = rnd.nextDouble() * size.width;
      final y = rnd.nextDouble() * size.height;
      final r = 1.2 + rnd.nextDouble() * 2.2;
      final opacity = isDark ? 0.12 + rnd.nextDouble() * 0.14 : 0.08 + rnd.nextDouble() * 0.1;
      final colors = [
        AppColors.neonCyan,
        AppColors.neonBlueLite,
        AppColors.neonPurpleLite,
        AppColors.accent,
      ];
      final paint = Paint()..color = colors[i % colors.length].withValues(alpha: opacity);
      canvas.drawCircle(Offset(x, y), r, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _ParticlesPainter oldDelegate) =>
      oldDelegate.count != count || oldDelegate.isDark != isDark;
}

/// Animated mesh gradient header background.
class WorkoutHeroBackdrop extends StatelessWidget {
  const WorkoutHeroBackdrop({super.key});

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Color(0xFF050814),
                Color(0xFF0B1024),
                Color(0xFF070712),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        Positioned(
          top: -40,
          right: -30,
          child: Container(
            width: 220,
            height: 220,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  AppColors.neonBlue.withValues(alpha: 0.35),
                  AppColors.neonPurple.withValues(alpha: 0.08),
                  AppColors.neonPurple.withValues(alpha: 0),
                ],
              ),
            ),
          ),
        ),
        Positioned(
          bottom: 10,
          left: -20,
          child: Container(
            width: 180,
            height: 180,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  AppColors.accent.withValues(alpha: 0.22),
                  AppColors.neonCyan.withValues(alpha: 0.06),
                  AppColors.accent.withValues(alpha: 0),
                ],
              ),
            ),
          ),
        ),
        const WorkoutParticleField(count: 16),
      ],
    );
  }
}
