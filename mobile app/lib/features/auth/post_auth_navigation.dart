import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../media/onboarding_profile_photo_screen.dart';

/// Routes after a valid session (password login or biometric unlock).
Future<void> navigateAfterAuthenticatedSession(BuildContext context) async {
  try {
    final prefs = await SharedPreferences.getInstance()
        .timeout(const Duration(seconds: 2));
    final dismissed = prefs.getBool(kProfilePhotoPromptDismissedKey) ?? false;
    if (!context.mounted) return;
    if (!dismissed) {
      context.go('/onboarding/photo');
      return;
    }
  } catch (_) {}

  if (!context.mounted) return;
  context.go('/home');
}
