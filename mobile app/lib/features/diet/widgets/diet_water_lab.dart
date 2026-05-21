import 'dart:math' as math;

import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';

class DietWaterLab extends StatefulWidget {
  const DietWaterLab({super.key, required this.goalMl, required this.currentMl, required this.onAdd});

  final int goalMl;
  final int currentMl;
  final ValueChanged<int> onAdd;

  @override
  State<DietWaterLab> createState() => _DietWaterLabState();
}

class _DietWaterLabState extends State<DietWaterLab> with SingleTickerProviderStateMixin {
  late final AnimationController _wave = AnimationController(vsync: this, duration: const Duration(seconds: 3))
    ..repeat();

  @override
  void dispose() {
    _wave.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pct = widget.goalMl <= 0 ? 0.0 : (widget.currentMl / widget.goalMl).clamp(0.0, 1.0);

    return GlassCard(
      radius: 28,
      padding: const EdgeInsets.all(AppSpacing.lg),
      tint: AppColors.neonBlue.withValues(alpha: 0.06),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('HYDRATION MATRIX', style: FitnessText.label(context)),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              SizedBox(
                width: 120,
                height: 160,
                child: AnimatedBuilder(
                  animation: _wave,
                  builder: (context, _) {
                    return CustomPaint(
                      painter: _BottlePainter(fill: pct, phase: _wave.value * math.pi * 2),
                      child: const SizedBox.expand(),
                    );
                  },
                ),
              ),
              const SizedBox(width: AppSpacing.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${widget.currentMl} / ${widget.goalMl} ml',
                      style: FitnessText.metric(context, size: 22),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${(pct * 100).round()}% fluid equilibrium',
                      style: FitnessText.body(context, color: AppColors.neonCyan),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _AddWaterChip(label: '+250', onTap: () => widget.onAdd(250)),
                        _AddWaterChip(label: '+500', onTap: () => widget.onAdd(500)),
                        _AddWaterChip(label: '+750', onTap: () => widget.onAdd(750)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms);
  }
}

class _AddWaterChip extends StatelessWidget {
  const _AddWaterChip({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      color: AppColors.surfaceDarkAlt.withValues(alpha: 0.75),
      borderRadius: BorderRadius.circular(999),
      onPressed: onTap,
      child: Text(label, style: FitnessText.chip(context)),
    );
  }
}

class _BottlePainter extends CustomPainter {
  _BottlePainter({required this.fill, required this.phase});

  final double fill;
  final double phase;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final r = RRect.fromRectAndRadius(Rect.fromLTWH(8, 12, w - 16, h - 24), const Radius.circular(22));
    final bg = Paint()..color = CupertinoColors.white.withValues(alpha: 0.06);
    canvas.drawRRect(r, bg);

    final clipPath = Path()..addRRect(r);
    canvas.save();
    canvas.clipPath(clipPath);

    final fillH = (h - 28) * fill;
    final wave = Paint()
      ..shader = LinearGradient(
        colors: [
          AppColors.neonCyan.withValues(alpha: 0.75),
          AppColors.neonBlue.withValues(alpha: 0.65),
        ],
        begin: Alignment.bottomLeft,
        end: Alignment.topRight,
      ).createShader(Rect.fromLTWH(0, h - fillH - 20, w, fillH + 40));

    final path = Path();
    final baseY = h - 12 - fillH;
    path.moveTo(0, baseY + 8);
    for (var x = 0.0; x <= w; x += 6) {
      final y = baseY + math.sin((x / w) * math.pi * 2 + phase) * 4;
      path.lineTo(x, y);
    }
    path.lineTo(w, h);
    path.lineTo(0, h);
    path.close();
    canvas.drawPath(path, wave);
    canvas.restore();

    final border = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..color = AppColors.neonCyan.withValues(alpha: 0.35);
    canvas.drawRRect(r, border);
  }

  @override
  bool shouldRepaint(covariant _BottlePainter oldDelegate) =>
      oldDelegate.fill != fill || oldDelegate.phase != phase;
}
