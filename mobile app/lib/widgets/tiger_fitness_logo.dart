import 'package:flutter/cupertino.dart';

/// Tiger Fitness brand logo — matches web `/tiger-fitness-logo.png`.
class TigerFitnessLogo extends StatelessWidget {
  const TigerFitnessLogo({
    super.key,
    this.height = 120,
    this.maxWidth,
    this.fit = BoxFit.contain,
  });

  final double height;
  final double? maxWidth;
  final BoxFit fit;

  static const _asset = 'assets/branding/tiger_fitness_logo.png';

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      _asset,
      height: height,
      width: maxWidth,
      fit: fit,
      filterQuality: FilterQuality.high,
      errorBuilder: (_, __, ___) => const _LogoFallback(),
    );
  }
}

/// Square mark for compact headers (nav, tiles).
class TigerFitnessMark extends StatelessWidget {
  const TigerFitnessMark({super.key, this.size = 44});

  final double size;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(size * 0.18),
      child: Image.asset(
        TigerFitnessLogo._asset,
        width: size,
        height: size,
        fit: BoxFit.cover,
        filterQuality: FilterQuality.high,
        errorBuilder: (_, __, ___) => SizedBox(
          width: size,
          height: size,
          child: const _LogoFallback(),
        ),
      ),
    );
  }
}

/// Splash / login hero block.
class TigerFitnessBrandBlock extends StatelessWidget {
  const TigerFitnessBrandBlock({
    super.key,
    this.compact = false,
    this.showTagline = true,
  });

  final bool compact;
  final bool showTagline;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TigerFitnessLogo(height: compact ? 88 : 140),
        if (showTagline) ...[
          const SizedBox(height: 12),
          Text(
            'STRENGTH · DISCIPLINE · RESULTS',
            style: TextStyle(
              color: CupertinoColors.white.withValues(alpha: 0.55),
              fontSize: compact ? 9 : 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 2,
            ),
          ),
        ],
      ],
    );
  }
}

class _LogoFallback extends StatelessWidget {
  const _LogoFallback();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        'TIGER\nFITNESS',
        textAlign: TextAlign.center,
        style: TextStyle(
          color: Color(0xFFFFD100),
          fontWeight: FontWeight.w900,
          fontSize: 14,
          height: 1.1,
          letterSpacing: 1,
        ),
      ),
    );
  }
}
