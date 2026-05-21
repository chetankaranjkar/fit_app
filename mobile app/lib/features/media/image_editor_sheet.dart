import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';

import '../../core/media_urls.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import 'image_cropper_bridge.dart';

/// Preview, zoom, rotate, crop (when supported), “Remove BG” placeholder.
Future<Uint8List?> showPremiumImageEditor(
  BuildContext context, {
  required Uint8List initialBytes,
  required bool circleCrop,
  String title = 'Adjust photo',
}) {
  return showCupertinoModalPopup<Uint8List>(
    context: context,
    builder: (ctx) => _ImageEditorPopup(
      title: title,
      initialBytes: initialBytes,
      circleCrop: circleCrop,
    ),
  );
}

class _ImageEditorPopup extends StatefulWidget {
  const _ImageEditorPopup({
    required this.title,
    required this.initialBytes,
    required this.circleCrop,
  });

  final String title;
  final Uint8List initialBytes;
  final bool circleCrop;

  @override
  State<_ImageEditorPopup> createState() => _ImageEditorPopupState();
}

class _ImageEditorPopupState extends State<_ImageEditorPopup> {
  late Uint8List _bytes;
  var _busy = false;

  @override
  void initState() {
    super.initState();
    _bytes = widget.initialBytes;
  }

  Future<void> _rotate() async {
    setState(() => _busy = true);
    try {
      _bytes = ImageProcessing.rotate90(_bytes);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _crop() async {
    if (kIsWeb) {
      _showWebCropHint();
      return;
    }
    setState(() => _busy = true);
    try {
      final out = await cropImageBytes(_bytes, circle: widget.circleCrop);
      if (out != null && mounted) setState(() => _bytes = out);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _showWebCropHint() {
    showCupertinoDialog<void>(
      context: context,
      builder: (c) => CupertinoAlertDialog(
        title: const Text('Crop on web'),
        content: const Text(
          'Pinch to zoom above. For guided crops and face framing, use the iOS/Android app.',
        ),
        actions: [CupertinoDialogAction(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Container(
      height: MediaQuery.sizeOf(context).height * 0.92,
      decoration: BoxDecoration(
        color: AppColors.resolveSurface(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 8),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.resolveBorder(context),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              children: [
                Expanded(
                  child: Text(widget.title, style: AppType.title3.copyWith(color: AppColors.resolveText(context))),
                ),
                CupertinoButton(
                  padding: EdgeInsets.zero,
                  onPressed: _busy ? null : () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.lg),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    InteractiveViewer(
                      minScale: 0.6,
                      maxScale: 4,
                      child: Image.memory(_bytes, fit: BoxFit.contain),
                    ),
                    if (_busy)
                      ColoredBox(
                        color: CupertinoColors.black.withValues(alpha: 0.25),
                        child: const Center(child: CupertinoActivityIndicator()),
                      ),
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, bottom + AppSpacing.md),
            child: Column(
              children: [
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      color: AppColors.resolveSurfaceAlt(context),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      onPressed: _busy ? null : _rotate,
                      child: Text('Rotate', style: AppType.button.copyWith(color: AppColors.resolveText(context))),
                    ),
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      color: AppColors.resolveSurfaceAlt(context),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      onPressed: _busy ? null : _crop,
                      child: Text(
                        widget.circleCrop ? 'Face crop' : 'Crop',
                        style: AppType.button.copyWith(color: AppColors.resolveText(context)),
                      ),
                    ),
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      color: AppColors.resolveSurfaceAlt(context).withValues(alpha: 0.45),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      onPressed: null,
                      child: Text(
                        'Remove BG (soon)',
                        style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                SizedBox(
                  width: double.infinity,
                  child: CupertinoButton.filled(
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    onPressed: _busy ? null : () => Navigator.of(context).pop(_bytes),
                    child: const Text('Use photo'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
