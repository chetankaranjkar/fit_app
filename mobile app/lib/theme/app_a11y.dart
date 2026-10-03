import 'package:flutter/cupertino.dart';

import 'app_typography.dart';

/// Accessibility tokens used by theme helpers and shared widgets.
class AppA11y {
  AppA11y._();

  /// WCAG 2.2 minimum target for pointer / touch controls.
  static const double minTouchTarget = 48;

  static bool reduceMotion(BuildContext context) =>
      MediaQuery.disableAnimationsOf(context);

  static bool boldText(BuildContext context) => MediaQuery.boldTextOf(context);

  static TextScaler textScalerOf(BuildContext context) =>
      MediaQuery.textScalerOf(context);

  /// Treat 1.35× and above as “large text” for wrap vs ellipsis.
  static bool isLargeText(BuildContext context) =>
      textScalerOf(context).scale(16) >= 16 * 1.35;

  static Duration motion(BuildContext context, Duration duration) =>
      reduceMotion(context) ? Duration.zero : duration;

  static TextStyle applyTextStyle(BuildContext context, TextStyle style) {
    if (!boldText(context)) return style;
    final current = style.fontWeight ?? FontWeight.w400;
    if (current.value >= FontWeight.w700.value) return style;
    return style.copyWith(fontWeight: FontWeight.w700);
  }

  /// Extra lines when Dynamic Type is large so titles do not overflow.
  static int? wrapMaxLines(BuildContext context, int? maxLines) {
    if (maxLines == null) return null;
    if (!isLargeText(context)) return maxLines;
    return maxLines < 4 ? 4 : maxLines;
  }

  static Widget maybeAnimate(
    BuildContext context,
    Widget child,
    Widget Function(Widget animated) apply,
  ) {
    if (reduceMotion(context)) return child;
    return apply(child);
  }
}

/// Body text that respects bold-text, scaling, and overflow.
class AppText extends StatelessWidget {
  const AppText(
    this.data, {
    super.key,
    this.style,
    this.color,
    this.maxLines,
    this.overflow,
    this.textAlign,
    this.softWrap = true,
  });

  final String data;
  final TextStyle? style;
  final Color? color;
  final int? maxLines;
  final TextOverflow? overflow;
  final TextAlign? textAlign;
  final bool softWrap;

  @override
  Widget build(BuildContext context) {
    var resolved = AppA11y.applyTextStyle(context, style ?? AppType.body);
    if (color != null) resolved = resolved.copyWith(color: color);
    final lines = AppA11y.wrapMaxLines(context, maxLines);
    return Text(
      data,
      style: resolved,
      maxLines: lines,
      overflow: lines == null
          ? (overflow ?? TextOverflow.visible)
          : (overflow ?? TextOverflow.ellipsis),
      textAlign: textAlign,
      softWrap: softWrap,
    );
  }
}
