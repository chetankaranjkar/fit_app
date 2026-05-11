import 'package:flutter/cupertino.dart';

/// PulseFit wordmark + geometric mark: ECG pulse inside a precision ring (vector, any size).
class PulseFitBrandBlock extends StatelessWidget {
  const PulseFitBrandBlock({
    super.key,
    this.compact = false,
    this.showTagline = true,
  });

  final bool compact;
  final bool showTagline;

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.maybeBrightnessOf(context) == Brightness.dark;
    final titleColor =
        isDark ? CupertinoColors.white : const Color(0xFF0D0D0F);
    final subColor =
        isDark ? CupertinoColors.white : CupertinoColors.systemGrey;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            PulseFitMark(size: compact ? 40 : 52),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'PULSE',
                  style: TextStyle(
                    color: titleColor,
                    fontSize: compact ? 22 : 28,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                    height: 1.0,
                  ),
                ),
                Text(
                  'FIT',
                  style: TextStyle(
                    color: const Color(0xFFFF6B2C),
                    fontSize: compact ? 22 : 28,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                    height: 1.0,
                  ),
                ),
              ],
            ),
          ],
        ),
        if (showTagline) ...[
          const SizedBox(height: 8),
          Text(
            'STRENGTH \u00B7 PRECISION \u00B7 PROGRESS',
            style: TextStyle(
              color: subColor.withValues(alpha: 0.65),
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 2,
            ),
          ),
        ],
      ],
    );
  }
}

class PulseFitMark extends StatelessWidget {
  const PulseFitMark({super.key, this.size = 56});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _PulseFitMarkPainter(),
      ),
    );
  }
}

class _PulseFitMarkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final r = size.shortestSide / 2;
    final c = Offset(size.width / 2, size.height / 2);

    final ringPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = r * 0.09
      ..shader = const LinearGradient(
        colors: [Color(0xFFFF6B2C), Color(0xFFFF2D6A), Color(0xFF7C4DFF)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(Rect.fromCircle(center: c, radius: r));

    canvas.drawCircle(c, r * 0.88, ringPaint);

    final inner = Paint()
      ..color = const Color(0x15000000)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(c, r * 0.62, inner);

    final pulsePaint = Paint()
      ..color = const Color(0xFFFF6B2C)
      ..style = PaintingStyle.stroke
      ..strokeWidth = r * 0.11
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final w = size.width;
    final h = size.height;
    final path = Path()
      ..moveTo(w * 0.18, h * 0.52)
      ..lineTo(w * 0.28, h * 0.52)
      ..lineTo(w * 0.36, h * 0.30)
      ..lineTo(w * 0.46, h * 0.72)
      ..lineTo(w * 0.56, h * 0.38)
      ..quadraticBezierTo(w * 0.62, h * 0.28, w * 0.72, h * 0.52)
      ..lineTo(w * 0.82, h * 0.52);
    canvas.drawPath(path, pulsePaint);

    canvas.drawCircle(Offset(w * 0.72, h * 0.52), r * 0.07,
        Paint()..color = const Color(0xFFFF2D6A));
    canvas.drawCircle(Offset(w * 0.72, h * 0.52), r * 0.035,
        Paint()..color = const Color(0xFFFFFFFF));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
