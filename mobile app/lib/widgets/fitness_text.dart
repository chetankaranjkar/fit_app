import 'package:flutter/cupertino.dart';
import '../theme/app_a11y.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

/// Fitness screens share system typography and accessibility settings.
class FitnessText {
  FitnessText._();
  static TextStyle _style(BuildContext c, TextStyle s, {Color? color}) =>
      AppA11y.applyTextStyle(
          c, s.copyWith(color: color ?? AppColors.resolveText(c)));
  static TextStyle display(BuildContext c,
          {double size = 30, FontWeight w = FontWeight.w700}) =>
      _style(c, AppType.title1.copyWith(fontSize: size, fontWeight: w));
  static TextStyle title(BuildContext c, {FontWeight w = FontWeight.w600}) =>
      _style(c, AppType.title3.copyWith(fontWeight: w));
  static TextStyle label(BuildContext c, {Color? color}) =>
      _style(c, AppType.footnote,
          color: color ?? AppColors.resolveTextSecondary(c));
  static TextStyle metric(BuildContext c, {double size = 22}) =>
      _style(c, AppType.metric.copyWith(fontSize: size));
  static TextStyle body(BuildContext c, {Color? color}) =>
      _style(c, AppType.subhead,
          color: color ?? AppColors.resolveTextSecondary(c));
  static TextStyle chip(BuildContext c, {Color? color}) =>
      _style(c, AppType.footnote.copyWith(fontWeight: FontWeight.w600),
          color: color);
}
