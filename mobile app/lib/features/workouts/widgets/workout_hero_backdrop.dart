import 'dart:math' as math;

import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_colors.dart';

/// Subtle floating particles over the workout hero gradient.
class WorkoutParticleField extends StatefulWidget {
  const WorkoutParticleField({super.key, this.count = 14});

  final int count;

  @override
  State<WorkoutParticleField> createState() => _WorkoutParticleFieldState();
}

class _WorkoutParticleFieldState extends State<WorkoutParticleField>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(seconds: 18))..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          final t = _c.value * math.pi * 2;
          return CustomPaint(
            painter: _ParticlesPainter(
              progress: t,
              count: widget.count,
              isDark: CupertinoTheme.of(context).brightness == Brightness.dark,
            ),
            size: Size.infinite,
          );
        },
      ),
    );
  }
}

class _ParticlesPainter extends CustomPainter {
  _ParticlesPainter({
    required this.progress,
    required this.count,
    required this.isDark,
  });

  final double progress;
  final int count;
  final bool isDark;

  @override
  void paint(Canvas canvas, Size size) {
    final rnd = math.Random(42);
    for (var i = 0; i < count; i++) {
      final x = rnd.nextDouble() * size.width;
      final baseY = rnd.nextDouble() * size.height;
      final r = 1.2 + rnd.nextDouble() * 2.2;
      final speed = 0.4 + rnd.nextDouble() * 0.9;
      final y = (baseY + math.sin(progress * speed + i) * 10) % size.height;
      final opacity = isDark ? 0.12 + rnd.nextDouble() * 0.14 : 0.08 + rnd.nextDouble() * 0.1;
      final colors = [
        AppColors.neonCyan,
        AppColors.neonBlueLite,
        AppColors.neonPurpleLite,
        AppColors.accent,
      ];
      final paint = Paint()
        ..color = colors[i % colors.length].withValues(alpha: opacity)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1.2);
      canvas.drawCircle(Offset(x, y), r, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _ParticlesPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.isDark != isDark;
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
          )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scaleXY(begin: 0.92, end: 1.06, duration: 6.seconds, curve: Curves.easeInOut),
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
          )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scaleXY(begin: 0.94, end: 1.08, duration: 7.seconds, curve: Curves.easeInOut),
        ),
        const WorkoutParticleField(count: 16),
      ],
    );
  }
}
