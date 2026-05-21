import 'package:flutter/cupertino.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_colors.dart';

/// Display typography for premium fitness modules (does not alter global app theme).
class FitnessText {
  FitnessText._();

  static TextStyle display(BuildContext c, {double size = 30, FontWeight w = FontWeight.w700}) =>
      GoogleFonts.spaceGrotesk(
        fontSize: size,
        fontWeight: w,
        letterSpacing: -0.8,
        height: 1.05,
        color: AppColors.resolveText(c),
      );

  static TextStyle title(BuildContext c, {FontWeight w = FontWeight.w600}) => GoogleFonts.spaceGrotesk(
        fontSize: 20,
        fontWeight: w,
        letterSpacing: -0.3,
        height: 1.2,
        color: AppColors.resolveText(c),
      );

  static TextStyle label(BuildContext c, {Color? color}) => GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.6,
        height: 1.2,
        color: color ?? AppColors.resolveTextSecondary(c),
      );

  static TextStyle metric(BuildContext c, {double size = 22}) => GoogleFonts.spaceGrotesk(
        fontSize: size,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.4,
        height: 1,
        color: AppColors.resolveText(c),
      );

  static TextStyle body(BuildContext c, {Color? color}) => GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.35,
        color: color ?? AppColors.resolveTextSecondary(c),
      );

  static TextStyle chip(BuildContext c, {Color? color}) => GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        height: 1.2,
        color: color ?? AppColors.resolveText(c),
      );
}
