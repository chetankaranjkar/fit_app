import 'package:flutter/cupertino.dart';

/// Apple HIG-inspired type scale with cross-platform fallbacks (SF on iOS, Roboto on Android).
class AppType {
  AppType._();

  static const String fontFamily = '.SF Pro Text';
  static const List<String> fontFamilyFallback = ['Roboto', 'Segoe UI', 'sans-serif'];

  static TextStyle _w(TextStyle s) => s.copyWith(fontFamilyFallback: fontFamilyFallback);

  static TextStyle get largeTitle => _w(
        const TextStyle(
          fontFamily: fontFamily,
          fontSize: 34,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
          height: 1.1,
        ),
      );

  static TextStyle get title1 => _w(
        const TextStyle(
          fontFamily: fontFamily,
          fontSize: 28,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
          height: 1.15,
        ),
      );

  static TextStyle get title2 => _w(
        const TextStyle(
          fontFamily: fontFamily,
          fontSize: 22,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
          height: 1.2,
        ),
      );

  static TextStyle get title3 => _w(
        const TextStyle(
          fontFamily: fontFamily,
          fontSize: 20,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.1,
          height: 1.25,
        ),
      );

  static TextStyle get headline => _w(
        const TextStyle(
          fontFamily: fontFamily,
          fontSize: 17,
          fontWeight: FontWeight.w600,
          height: 1.3,
        ),
      );

  static TextStyle get body => _w(
        const TextStyle(
          fontFamily: fontFamily,
          fontSize: 16,
          fontWeight: FontWeight.w400,
          height: 1.4,
        ),
      );

  static TextStyle get callout => _w(
        const TextStyle(
          fontFamily: fontFamily,
          fontSize: 15,
          fontWeight: FontWeight.w500,
          height: 1.35,
        ),
      );

  static TextStyle get subhead => _w(
        const TextStyle(
          fontFamily: fontFamily,
          fontSize: 14,
          fontWeight: FontWeight.w400,
          height: 1.35,
        ),
      );

  static TextStyle get footnote => _w(
        const TextStyle(
          fontFamily: fontFamily,
          fontSize: 13,
          fontWeight: FontWeight.w400,
          height: 1.3,
        ),
      );

  static TextStyle get caption => _w(
        const TextStyle(
          fontFamily: fontFamily,
          fontSize: 12,
          fontWeight: FontWeight.w400,
          height: 1.25,
        ),
      );

  static TextStyle get button => _w(
        const TextStyle(
          fontFamily: fontFamily,
          fontSize: 16,
          fontWeight: FontWeight.w600,
          height: 1.2,
        ),
      );

  static TextStyle get metric => _w(
        const TextStyle(
          fontFamily: fontFamily,
          fontSize: 32,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.5,
          height: 1,
        ),
      );
}
