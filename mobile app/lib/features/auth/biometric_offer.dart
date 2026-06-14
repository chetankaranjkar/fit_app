import 'package:flutter/cupertino.dart';

import '../../services/biometric_prefs.dart';
import '../../services/biometric_service.dart';

/// One-time opt-in after successful password login.
Future<void> offerBiometricUnlockIfAvailable(BuildContext context) async {
  if (!context.mounted) return;
  if (!await BiometricService.instance.canAuthenticate()) return;
  if (await BiometricPrefs.isEnabled()) return;

  final label = await BiometricService.instance.unlockLabel();
  if (!context.mounted) return;

  final enable = await showCupertinoDialog<bool>(
    context: context,
    builder: (ctx) => CupertinoAlertDialog(
      title: Text('Enable $label?'),
      content: Text(
        'Use $label to open Tiger Fitness faster on this device. '
        'You can still sign in with your password anytime.',
      ),
      actions: [
        CupertinoDialogAction(
          onPressed: () => Navigator.pop(ctx, false),
          child: const Text('Not now'),
        ),
        CupertinoDialogAction(
          isDefaultAction: true,
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('Enable'),
        ),
      ],
    ),
  );

  if (enable != true) return;

  final ok = await BiometricService.instance.authenticate(
    reason: 'Confirm $label for Tiger Fitness',
  );
  if (ok) {
    await BiometricPrefs.setEnabled(true);
  }
}
