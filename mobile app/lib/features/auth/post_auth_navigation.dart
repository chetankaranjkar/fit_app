import 'package:flutter/cupertino.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../services/auth_service.dart';
import '../../services/push_notification_service.dart';
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
  await goHomeOrPendingPush(context);
}

/// Opens a stashed notification tap when the session owns it; otherwise Home.
Future<void> goHomeOrPendingPush(BuildContext context) async {
  final session = await AuthService.instance.readCachedSession();
  final pending = await PushNotificationService.instance.consumePendingAfterAuth(
    sessionUserId: session?.userId,
  );
  if (!context.mounted) return;
  if (pending != null && pending.shouldNavigate) {
    return;
  }
  context.go('/home');
}
