import 'dart:io';

import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';

/// Requests camera access before capture flows.
Future<bool> ensureCameraPermission(BuildContext context) async {
  if (kIsWeb) return true;
  var status = await Permission.camera.status;
  if (status.isGranted) return true;
  status = await Permission.camera.request();
  if (status.isGranted) return true;
  if (!context.mounted) return false;
  if (status.isPermanentlyDenied) {
    await _showSettingsDialog(context, title: 'Camera access', message: 'Allow camera access in Settings to take a profile photo.');
  }
  return false;
}

/// Requests photo library access before gallery pickers.
Future<bool> ensureGalleryPermission(BuildContext context) async {
  if (kIsWeb) return true;
  Permission permission;
  if (Platform.isIOS) {
    permission = Permission.photos;
  } else if (Platform.isAndroid) {
    permission = Permission.photos;
  } else {
    return true;
  }

  var status = await permission.status;
  if (status.isGranted || status.isLimited) return true;
  status = await permission.request();
  if (status.isGranted || status.isLimited) return true;

  // Android 12 and below
  if (Platform.isAndroid) {
    final storage = await Permission.storage.request();
    if (storage.isGranted) return true;
  }

  if (!context.mounted) return false;
  if (status.isPermanentlyDenied) {
    await _showSettingsDialog(
      context,
      title: 'Photos access',
      message: 'Allow photo library access in Settings to choose a profile picture.',
    );
  }
  return false;
}

Future<void> _showSettingsDialog(
  BuildContext context, {
  required String title,
  required String message,
}) {
  return showCupertinoDialog<void>(
    context: context,
    builder: (ctx) => CupertinoAlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        CupertinoDialogAction(onPressed: () => Navigator.pop(ctx), child: const Text('Not now')),
        CupertinoDialogAction(
          isDefaultAction: true,
          onPressed: () {
            Navigator.pop(ctx);
            openAppSettings();
          },
          child: const Text('Open Settings'),
        ),
      ],
    ),
  );
}
