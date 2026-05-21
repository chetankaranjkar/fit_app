import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:flutter/cupertino.dart';

/// Full-screen live capture with multi-camera selection (mobile / desktop).
class CameraCapturePage extends StatefulWidget {
  const CameraCapturePage({super.key, required this.cameras, this.initialIndex = 0});

  final List<CameraDescription> cameras;
  final int initialIndex;

  @override
  State<CameraCapturePage> createState() => _CameraCapturePageState();
}

class _CameraCapturePageState extends State<CameraCapturePage> {
  CameraController? _controller;
  var _index = 0;
  var _initializing = true;
  var _capturing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final last = widget.cameras.length - 1;
    final safeLast = last < 0 ? 0 : last;
    _index = widget.initialIndex.clamp(0, safeLast);
    _openCamera(_index);
  }

  Future<void> _openCamera(int i) async {
    setState(() {
      _initializing = true;
      _error = null;
    });
    await _controller?.dispose();
    final cam = widget.cameras[i];
    final controller = CameraController(cam, ResolutionPreset.high, enableAudio: false);
    try {
      await controller.initialize();
      if (!mounted) return;
      setState(() {
        _controller = controller;
        _index = i;
        _initializing = false;
      });
    } on Object catch (e) {
      await controller.dispose();
      if (!mounted) return;
      setState(() {
        _controller = null;
        _initializing = false;
        _error = '$e';
      });
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _capture() async {
    final c = _controller;
    if (c == null || !c.value.isInitialized || _capturing) return;
    setState(() => _capturing = true);
    try {
      final snap = await c.takePicture();
      final bytes = await snap.readAsBytes();
      if (!mounted) return;
      Navigator.of(context).pop<Uint8List>(Uint8List.fromList(bytes));
    } on Object catch (e) {
      if (!mounted) return;
      setState(() => _capturing = false);
      showCupertinoDialog<void>(
        context: context,
        builder: (ctx) => CupertinoAlertDialog(
          title: const Text('Capture failed'),
          content: Text('$e'),
          actions: [
            CupertinoDialogAction(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.cameras.isEmpty) {
      return const CupertinoPageScaffold(
        navigationBar: CupertinoNavigationBar(middle: Text('Camera')),
        child: Center(child: Text('No cameras found.')),
      );
    }

    final c = _controller;

    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Capture'),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () => Navigator.of(context).pop(),
          child: const Icon(CupertinoIcons.xmark_circle),
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            if (widget.cameras.length > 1)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: SizedBox(
                  height: 120,
                  child: CupertinoPicker(
                    scrollController: FixedExtentScrollController(initialItem: _index),
                    itemExtent: 36,
                    onSelectedItemChanged: _openCamera,
                    children: [
                      for (var i = 0; i < widget.cameras.length; i++)
                        Center(
                          child: Text(
                            _labelFor(widget.cameras[i], i),
                            style: const TextStyle(fontSize: 15),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: _initializing
                      ? const Center(child: CupertinoActivityIndicator())
                      : _error != null
                          ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!)))
                          : c != null && c.value.isInitialized
                              ? CameraPreview(c)
                              : const Center(child: Text('Camera unavailable')),
                ),
              ),
            ),
            const SizedBox(height: 12),
            CupertinoButton.filled(
              onPressed: _initializing || _error != null ? null : _capture,
              child: _capturing
                  ? const CupertinoActivityIndicator(color: CupertinoColors.white)
                  : const Text('Capture'),
            ),
            const SizedBox(height: 12),
            CupertinoButton(
              onPressed: _capturing ? null : () => Navigator.of(context).pop(),
              child: const Text('Retake / Cancel'),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  static String _labelFor(CameraDescription d, int i) {
    final lens = d.lensDirection == CameraLensDirection.front
        ? 'Front'
        : d.lensDirection == CameraLensDirection.back
            ? 'Rear'
            : 'Camera';
    return '$lens · ${d.name.isEmpty ? '#${i + 1}' : d.name}';
  }
}
