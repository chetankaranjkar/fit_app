import 'package:flutter/cupertino.dart';

/// Premium brand color tokens.
///
/// Visual identity = warm orange/gold luxury (primary) + cool purple/blue
/// neon highlights (secondary). The orange owns the brand; the purple/blue
/// shows up on focus glows, scanner overlays, accent borders, and
/// micro-decorations to tie the mobile app back to the React web platform.
class AppColors {
  AppColors._();

  // ── Primary brand (warm) ─────────────────────────────────────────────────
  static const Color accent      = Color(0xFFFF6B00); // Energetic orange
  static const Color accentSoft  = Color(0xFFFF9500); // Lighter orange
  static const Color accentBright = Color(0xFFFF9F0A); // Sunlight orange
  static const Color gold        = Color(0xFFFFB800); // Premium gold
  static const Color goldDark    = Color(0xFFCC8800); // Deep gold

  // ── Secondary accents (cool — inherited from React web app) ──────────────
  static const Color neonBlue    = Color(0xFF3B82F6); // React --color-neon-blue
  static const Color neonBlueLite = Color(0xFF60A5FA);
  static const Color neonPurple  = Color(0xFFA855F7); // React --color-neon-purple
  static const Color neonPurpleLite = Color(0xFFC084FC);
  static const Color violet      = Color(0xFF8B5CF6); // Mid-gradient stop
  static const Color neonCyan    = Color(0xFF22D3EE);

  // ── Semantic ─────────────────────────────────────────────────────────────
  static const Color success     = Color(0xFF00E676); // Neon green
  static const Color warning     = Color(0xFFFFB800); // Gold warning
  static const Color danger      = Color(0xFFFF2D55); // Hot red
  static const Color purple      = Color(0xFFBF5AF2); // System purple
  static const Color orange      = Color(0xFFFF9500); // Alias

  // ── Dark surfaces ────────────────────────────────────────────────────────
  static const Color bgDark            = Color(0xFF0D0D0F);
  static const Color bgDarkDeep        = Color(0xFF050510); // React parity
  static const Color surfaceDark       = Color(0xFF1A1A1F);
  static const Color surfaceDarkAlt    = Color(0xFF202033);
  static const Color textDark          = Color(0xFFFFFFFF);
  static const Color textDarkSecondary = Color(0xFFC7C7CC);
  static const Color borderDark        = Color(0xFF3A3A52);

  // ── Light surfaces (warm-tinted) ─────────────────────────────────────────
  static const Color bgLight            = Color(0xFFF5F0EB);
  static const Color surfaceLight       = Color(0xFFFFFFFF);
  static const Color surfaceLightAlt    = Color(0xFFF5EDE6);
  static const Color textLight          = Color(0xFF1C1C1E);
  static const Color textLightSecondary = Color(0xFF6E6E73);
  static const Color borderLight        = Color(0xFFE8DDD5);

  // ── Gradient presets ─────────────────────────────────────────────────────

  /// Main action gradient — orange → bright orange.
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFFF6B00), Color(0xFFFF9F0A)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Sunset gradient — orange → coral, used on FAB and hero CTAs.
  static const LinearGradient sunsetGradient = LinearGradient(
    colors: [Color(0xFFFF6B00), Color(0xFFFF2D55)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Premium membership card background — rich dark-gold.
  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFF3D2200), Color(0xFF7A4800), Color(0xFF3D2200)],
    stops: [0.0, 0.55, 1.0],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Gold shimmer overlay (applied on top of goldGradient).
  static const LinearGradient goldShimmer = LinearGradient(
    colors: [Color(0x00FFD060), Color(0x22FFD060), Color(0x00FFD060)],
    stops: [0.0, 0.5, 1.0],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// App background gradient — near-black to charcoal.
  static const LinearGradient darkGradient = LinearGradient(
    colors: [Color(0xFF0D0D0F), Color(0xFF1A1A1F)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  /// Energy / danger gradient — red → orange.
  static const LinearGradient energyGradient = LinearGradient(
    colors: [Color(0xFFFF2D55), Color(0xFFFF6B00)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Neon accent gradient — borrowed from React app (blue → purple).
  /// Use sparingly: focus rings, scanner frame, hero highlights.
  static const LinearGradient neonGradient = LinearGradient(
    colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6), Color(0xFFA855F7)],
    stops: [0.0, 0.5, 1.0],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Aurora gradient — full brand spectrum (orange → purple → blue).
  /// The signature gradient for the redesigned login background.
  static const LinearGradient auroraGradient = LinearGradient(
    colors: [
      Color(0xFFFF6B00),
      Color(0xFFFF2D55),
      Color(0xFFA855F7),
      Color(0xFF3B82F6),
    ],
    stops: [0.0, 0.35, 0.7, 1.0],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ── Glow / shadow tokens ─────────────────────────────────────────────────

  static List<BoxShadow> orangeGlow({double opacity = 0.45, double blur = 24}) =>
      [
        BoxShadow(
          color: accent.withValues(alpha: opacity),
          blurRadius: blur,
          spreadRadius: 1,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> goldGlow({double opacity = 0.35, double blur = 24}) =>
      [
        BoxShadow(
          color: gold.withValues(alpha: opacity),
          blurRadius: blur,
          spreadRadius: 1,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> purpleGlow({double opacity = 0.35, double blur = 28}) =>
      [
        BoxShadow(
          color: neonPurple.withValues(alpha: opacity),
          blurRadius: blur,
          spreadRadius: 1,
          offset: const Offset(0, 6),
        ),
      ];

  static List<BoxShadow> luxuryShadow(BuildContext c) {
    final isDark = CupertinoTheme.of(c).brightness == Brightness.dark;
    return [
      BoxShadow(
        color: const Color(0xFF000000).withValues(alpha: isDark ? 0.55 : 0.10),
        blurRadius: 28,
        offset: const Offset(0, 10),
      ),
      if (!isDark)
        BoxShadow(
          color: accent.withValues(alpha: 0.06),
          blurRadius: 18,
          offset: const Offset(0, 4),
        ),
    ];
  }

  // ── Context resolvers ────────────────────────────────────────────────────

  static Color resolveText(BuildContext c) =>
      CupertinoTheme.of(c).brightness == Brightness.dark ? textDark : textLight;

  static Color resolveTextSecondary(BuildContext c) =>
      CupertinoTheme.of(c).brightness == Brightness.dark
          ? textDarkSecondary
          : textLightSecondary;

  static Color resolveBg(BuildContext c) =>
      CupertinoTheme.of(c).brightness == Brightness.dark ? bgDark : bgLight;

  static Color resolveSurface(BuildContext c) =>
      CupertinoTheme.of(c).brightness == Brightness.dark ? surfaceDark : surfaceLight;

  static Color resolveSurfaceAlt(BuildContext c) =>
      CupertinoTheme.of(c).brightness == Brightness.dark ? surfaceDarkAlt : surfaceLightAlt;

  static Color resolveBorder(BuildContext c) =>
      CupertinoTheme.of(c).brightness == Brightness.dark ? borderDark : borderLight;
}
