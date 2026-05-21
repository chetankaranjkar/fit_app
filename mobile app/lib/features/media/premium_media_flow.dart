import 'package:file_picker/file_picker.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:image_picker/image_picker.dart';
import 'package:camera/camera.dart';

import '../../animations/app_motion.dart';
import '../../core/media_urls.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import 'camera_capture_page.dart';
import 'image_editor_sheet.dart';

enum PremiumMediaKind { profile, progress }

String _extForKind(PremiumMediaKind kind) => kind == PremiumMediaKind.profile ? 'profile' : 'progress';

/// Pick → edit (zoom/rotate/crop) → compress → JPEG bytes for upload.
Future<PremiumPickResult?> runPremiumMediaCapture(
  BuildContext context, {
  required PremiumMediaKind kind,
}) async {
  final source = await _pickSource(context);
  if (!context.mounted || source == null) return null;

  Uint8List? raw;
  var name = '${_extForKind(kind)}_${DateTime.now().millisecondsSinceEpoch}.jpg';

  try {
    switch (source) {
      case _MediaSource.camera:
        if (kIsWeb) {
          final x = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 95);
          if (x == null) return null;
          raw = await x.readAsBytes();
          name = x.name.isNotEmpty ? x.name : name;
        } else {
          final cams = await availableCameras();
          if (!context.mounted) return null;
          if (cams.isEmpty) {
            final x = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 95);
            if (x == null) return null;
            raw = await x.readAsBytes();
            name = x.name.isNotEmpty ? x.name : name;
          } else {
            raw = await Navigator.of(context).push<Uint8List>(
              CupertinoPageRoute(
                fullscreenDialog: true,
                builder: (_) => CameraCapturePage(cameras: cams),
              ),
            );
            if (raw == null) return null;
          }
        }
        break;
      case _MediaSource.gallery:
        final x = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 95);
        if (x == null) return null;
        raw = await x.readAsBytes();
        name = x.name.isNotEmpty ? x.name : name;
        break;
      case _MediaSource.files:
        final r = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: const ['jpg', 'jpeg', 'png', 'webp'],
          withData: true,
        );
        if (r == null || r.files.isEmpty) return null;
        final f = r.files.first;
        raw = f.bytes;
        if (f.name.isNotEmpty) name = f.name;
        if (raw == null) {
          if (!context.mounted) return null;
          showCupertinoDialog<void>(
            context: context,
            builder: (c) => CupertinoAlertDialog(
              title: const Text('Could not read file'),
              content: const Text('Try again with a smaller image or use Gallery.'),
              actions: [CupertinoDialogAction(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
            ),
          );
          return null;
        }
        break;
    }
  } on Object catch (e) {
    if (!context.mounted) return null;
    showCupertinoDialog<void>(
      context: context,
      builder: (c) => CupertinoAlertDialog(
        title: const Text('Could not read image'),
        content: Text('$e'),
        actions: [CupertinoDialogAction(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
      ),
    );
    return null;
  }

  final circle = kind == PremiumMediaKind.profile;
  if (!context.mounted) return null;
  final edited = await showPremiumImageEditor(
    context,
    initialBytes: raw,
    circleCrop: circle,
    title: circle ? 'Profile photo' : 'Progress photo',
  );
  if (!context.mounted || edited == null) return null;

  final maxEdge = kind == PremiumMediaKind.profile ? 1200 : 2200;
  final jpeg = ImageProcessing.resizeAndEncodeJpeg(edited, maxEdge: maxEdge, quality: 88);
  if (!name.toLowerCase().endsWith('.jpg') && !name.toLowerCase().endsWith('.jpeg')) {
    name = '$name.jpg';
  }
  return PremiumPickResult(bytes: jpeg, fileName: name);
}

enum _MediaSource { camera, gallery, files }

Future<_MediaSource?> _pickSource(BuildContext context) {
  return showCupertinoModalPopup<_MediaSource>(
    context: context,
    builder: (ctx) => Container(
      padding: EdgeInsets.only(bottom: MediaQuery.paddingOf(ctx).bottom + 20, top: 12),
      decoration: BoxDecoration(
        color: AppColors.resolveSurface(ctx),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.resolveBorder(ctx),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const SizedBox(height: 16),
            Text('Add photo', style: AppType.title3.copyWith(color: AppColors.resolveText(ctx))),
            const SizedBox(height: 8),
            _glassTile(
              ctx,
              icon: CupertinoIcons.camera_fill,
              label: 'Take photo',
              subtitle: kIsWeb ? 'Webcam (browser)' : 'Camera / USB camera',
              onTap: () => Navigator.pop(ctx, _MediaSource.camera),
            ).animate().fadeIn(duration: AppFx.quick, delay: 40.ms),
            _glassTile(
              ctx,
              icon: CupertinoIcons.photo_fill_on_rectangle_fill,
              label: 'Gallery',
              subtitle: 'Photos library',
              onTap: () => Navigator.pop(ctx, _MediaSource.gallery),
            ).animate().fadeIn(duration: AppFx.quick, delay: 80.ms),
            _glassTile(
              ctx,
              icon: CupertinoIcons.folder_fill,
              label: 'Files',
              subtitle: 'Browse files',
              onTap: () => Navigator.pop(ctx, _MediaSource.files),
            ).animate().fadeIn(duration: AppFx.quick, delay: 120.ms),
            const SizedBox(height: 8),
            CupertinoButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ],
        ),
      ),
    ),
  );
}

Widget _glassTile(
  BuildContext ctx, {
  required IconData icon,
  required String label,
  required String subtitle,
  required VoidCallback onTap,
}) {
  return Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    child: CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.resolveBorder(ctx).withValues(alpha: 0.5)),
          color: AppColors.resolveSurfaceAlt(ctx).withValues(alpha: 0.85),
          boxShadow: [
            BoxShadow(
              color: CupertinoColors.black.withValues(alpha: 0.2),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.accent, size: 26),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: AppType.body.copyWith(color: AppColors.resolveText(ctx), fontWeight: FontWeight.w600),
                  ),
                  Text(subtitle, style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(ctx))),
                ],
              ),
            ),
            Icon(CupertinoIcons.chevron_right, color: AppColors.resolveTextSecondary(ctx), size: 16),
          ],
        ),
      ),
    ),
  );
}

class PremiumPickResult {
  PremiumPickResult({required this.bytes, required this.fileName});
  final Uint8List bytes;
  final String fileName;
}
