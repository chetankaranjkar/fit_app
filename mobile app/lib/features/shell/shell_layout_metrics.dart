import 'dart:math' as math;

import 'package:flutter/widgets.dart';

/// Layout constants for the floating shell dock (safe-area aware).
class ShellLayoutMetrics {
  ShellLayoutMetrics._();

  /// Visual height of the floating pill (excluding bottom margin & system inset).
  static const double navBarHeight = 80;

  static const double dockBottomMargin = 22;
  static const double horizontalInset = 16;
  static const double navCornerRadius = 30;

  /// Minimum scroll padding so lists clear the dock on all devices.
  static const double minContentBottomPadding = 120;

  static double systemBottomInset(BuildContext context) =>
      MediaQuery.paddingOf(context).bottom;

  /// Distance from physical screen bottom to the dock's bottom edge.
  static double dockBottomOffset(BuildContext context) =>
      systemBottomInset(context) + dockBottomMargin;

  /// Total space reserved from screen bottom through the dock.
  static double dockOccupiedHeight(BuildContext context) =>
      dockBottomOffset(context) + navBarHeight;

  /// Use on scroll views / sliver padding so content is not hidden behind the dock.
  static double contentBottomPadding(BuildContext context) => math.max(
        minContentBottomPadding,
        dockOccupiedHeight(context) + 28,
      );

  static EdgeInsets scrollPadding(BuildContext context) => EdgeInsets.fromLTRB(
        horizontalInset,
        0,
        horizontalInset,
        contentBottomPadding(context),
      );

  /// FAB / floating actions above the dock.
  static double fabBottomOffset(BuildContext context) =>
      dockOccupiedHeight(context) + 12;
}
