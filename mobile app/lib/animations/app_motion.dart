import 'package:flutter/cupertino.dart';

/// Unified animation spec for the premium mobile experience.
class AppFx {
  AppFx._();

  static const Duration micro = Duration(milliseconds: 140);
  static const Duration quick = Duration(milliseconds: 220);
  static const Duration regular = Duration(milliseconds: 320);
  static const Duration relaxed = Duration(milliseconds: 480);
  static const Duration ambient = Duration(milliseconds: 5600);

  static const Curve entrance = Curves.easeOutCubic;
  static const Curve emphasized = Curves.easeOutBack;
  static const Curve ambientCurve = Curves.easeInOutSine;
}

