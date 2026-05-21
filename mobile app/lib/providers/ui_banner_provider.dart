import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Shown on Home after a successful QR check-in (deep link UX).
class CheckInBannerState {
  const CheckInBannerState({required this.title, required this.subtitle});
  final String title;
  final String subtitle;
}

final checkInBannerProvider = StateProvider<CheckInBannerState?>((ref) => null);
