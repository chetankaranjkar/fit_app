import 'package:flutter/cupertino.dart';
import 'package:permission_handler/permission_handler.dart';

/// In-app permission rationale. System dialogs are not restylable.
///
/// Buttons stay labelled **Open settings** / **Not now**. Android back pops
/// the dialog (default [PopScope] `canPop: true`).
Future<void> showPermissionRationaleDialog(
  BuildContext context, {
  required String title,
  required String message,
  bool openSettingsOnConfirm = true,
}) {
  return showCupertinoDialog<void>(
    context: context,
    builder: (ctx) => PopScope(
      canPop: true,
      child: CupertinoAlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Not now'),
          ),
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () {
              Navigator.pop(ctx);
              if (openSettingsOnConfirm) {
                openAppSettings();
              }
            },
            child: const Text('Open settings'),
          ),
        ],
      ),
    ),
  );
}
