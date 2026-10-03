import 'dart:async';
import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../services/qr_attendance_service.dart';
import '../../features/home/home_action_resolver.dart';
import '../../providers/ui_banner_provider.dart';
import '../../theme/app_a11y.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/app_button.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/press_scale.dart';
import 'check_in_location.dart';
import 'check_in_presentation.dart';
import 'check_in_scan_gate.dart';

/// 🔧 Set to `false` once the real backend endpoint is wired in
/// `qr_attendance_service.dart`. Stub mode is great for screen recordings,
/// design reviews, and demo days.
const bool kUseStubAttendance = false;

/// Premium fullscreen QR attendance scanner.
///
/// Surfaces outcome states from [AttendanceResult] (success, membership,
/// duplicate scan, invalid QR, location, session/auth, network).
class QrScannerScreen extends ConsumerStatefulWidget {
  const QrScannerScreen({super.key});

  @override
  ConsumerState<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends ConsumerState<QrScannerScreen> {
  late final MobileScannerController _controller;
  final CheckInScanGate _gate = CheckInScanGate();
  final CheckInLocationSource _location = const CheckInLocationSource();
  bool _torchOn = false;
  bool _isProcessing = false;
  bool _cameraReady = false;
  bool _cameraPrompted = false;
  bool _previewLocationPrompted = false;
  AttendanceResult? _result;
  Timer? _autoCloseTimer;
  bool _previewGpsLoading = true;
  double? _previewLat;
  double? _previewLng;
  CheckInLocationFailed? _previewLocationFailure;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _ensureCameraPermission();
      _refreshPreviewGps(requestIfDenied: true);
    });
  }

  Future<void> _ensureCameraPermission() async {
    if (_cameraPrompted) return;
    _cameraPrompted = true;
    var status = await Permission.camera.status;
    if (status.isDenied) {
      status = await Permission.camera.request();
    }
    if (!mounted) return;
    if (status.isGranted) {
      setState(() => _cameraReady = true);
      return;
    }
    _gate.begin();
    _gate.finishLocked();
    setState(() {
      _cameraReady = false;
      _result = AttendanceCameraIssue(
        permanentlyDenied: status.isPermanentlyDenied || status.isRestricted,
      );
    });
  }

  Future<void> _refreshPreviewGps({bool requestIfDenied = false}) async {
    if (mounted) {
      setState(() {
        _previewGpsLoading = true;
        _previewLocationFailure = null;
      });
    }
    final shouldAsk = requestIfDenied && !_previewLocationPrompted;
    if (shouldAsk) _previewLocationPrompted = true;
    final geo = await _location.resolve(requestIfDenied: shouldAsk);
    if (!mounted) return;
    if (geo is CheckInLocationReady) {
      setState(() {
        _previewLat = geo.position.latitude;
        _previewLng = geo.position.longitude;
        _previewGpsLoading = false;
        _previewLocationFailure = null;
      });
      return;
    }
    final failed = geo as CheckInLocationFailed;
    setState(() {
      _previewLat = null;
      _previewLng = null;
      _previewGpsLoading = false;
      _previewLocationFailure = failed;
    });
  }

  Future<void> _onPreviewGpsRetry() async {
    final failed = _previewLocationFailure;
    if (failed == null) {
      await _refreshPreviewGps(requestIfDenied: true);
      return;
    }
    switch (failed.kind) {
      case LocationIssueKind.permissionDeniedForever:
      case LocationIssueKind.permissionDenied:
        await openAppSettings();
        return;
      case LocationIssueKind.gpsOff:
        await Geolocator.openLocationSettings();
        return;
      case LocationIssueKind.noFix:
        await _refreshPreviewGps(requestIfDenied: false);
    }
  }

  @override
  void dispose() {
    _autoCloseTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (!_gate.begin()) return;
    final raw = capture.barcodes.firstWhere(
      (b) => (b.rawValue ?? '').isNotEmpty,
      orElse: () => const Barcode(),
    ).rawValue;
    if (raw == null || raw.isEmpty) {
      _gate.reset();
      return;
    }

    setState(() => _isProcessing = true);
    HapticFeedback.mediumImpact();
    await _controller.stop();

    final service = QrAttendanceService.instance;
    final result = kUseStubAttendance
        ? await service.submitStub(raw)
        : await service.submit(raw);

    _gate.finishLocked();
    if (!mounted) return;

    setState(() {
      _result = result;
      _isProcessing = false;
    });

    if (result is AttendanceSuccess) {
      HapticFeedback.heavyImpact();
      final r = result;
      ref.read(checkInBannerProvider.notifier).state = CheckInBannerState(
        title: 'Checked in',
        subtitle:
            '${r.memberName} • ${DateFormat('h:mm a').format(r.checkInTime.toLocal())}'
            '${r.planName != null ? '\n${r.planName}' : ''}',
      );
      _autoCloseTimer = Timer(const Duration(milliseconds: 2400), () {
        if (mounted) context.pop();
      });
    } else {
      HapticFeedback.heavyImpact();
    }
  }

  Future<void> _toggleTorch() async {
    HapticFeedback.selectionClick();
    await _controller.toggleTorch();
    if (mounted) setState(() => _torchOn = !_torchOn);
  }

  Future<void> _retry() async {
    HapticFeedback.selectionClick();
    _autoCloseTimer?.cancel();
    _gate.reset();
    setState(() {
      _result = null;
      _isProcessing = false;
    });
    if (_cameraReady) {
      await _controller.start();
    } else {
      _cameraPrompted = false;
      await _ensureCameraPermission();
    }
  }

  Future<void> _onPrimaryAction(CheckInNextAction action) async {
    switch (action) {
      case CheckInNextAction.none:
        return;
      case CheckInNextAction.retryScan:
      case CheckInNextAction.waitThenRetry:
        await _retry();
        return;
      case CheckInNextAction.openAppSettings:
        await openAppSettings();
        return;
      case CheckInNextAction.openLocationSettings:
        await Geolocator.openLocationSettings();
        return;
      case CheckInNextAction.viewMembership:
        if (mounted) context.go(kMemberPaymentHandoffRoute);
        return;
      case CheckInNextAction.goHome:
        if (mounted) context.go('/home');
        return;
      case CheckInNextAction.close:
        if (mounted) context.pop();
        return;
    }
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: const Color(0xFF000000),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // ─── Camera ─────────────────────────────────────────────
          if (_cameraReady)
            MobileScanner(
              controller: _controller,
              onDetect: _onDetect,
              errorBuilder: (context, error, _) {
                final denied = error.errorCode == MobileScannerErrorCode.permissionDenied;
                return _ScannerError(
                  message: denied
                      ? 'Camera is blocked. Open Settings, allow Camera, then return to scan.'
                      : (error.errorDetails?.message ?? 'Camera error'),
                  onOpenSettings: denied
                      ? () {
                          openAppSettings();
                        }
                      : null,
                );
              },
            )
          else
            const ColoredBox(color: Color(0xFF000000)),

          // ─── Dimmed cutout overlay with neon frame ──────────────
          const _ScannerFrameOverlay(),

          // ─── Top chrome (close + torch) ─────────────────────────
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.sm,
              ),
              child: Row(
                children: [
                  _CircleChromeButton(
                    icon: CupertinoIcons.xmark,
                    semanticLabel: 'Close scanner',
                    onTap: () {
                      HapticFeedback.selectionClick();
                      context.pop();
                    },
                  ),
                  const Spacer(),
                  _CircleChromeButton(
                    icon: _torchOn
                        ? CupertinoIcons.bolt_fill
                        : CupertinoIcons.bolt,
                    semanticLabel: _torchOn ? 'Turn flashlight off' : 'Turn flashlight on',
                    activeGlow: _torchOn,
                    onTap: _toggleTorch,
                  ),
                ],
              ),
            ),
          ),

          // ─── Current GPS (match against branch lat/lng in admin API) ───
          if (_result == null)
            Positioned(
              left: 16,
              right: 16,
              bottom: 108,
              child: _ScannerGpsPreview(
                loading: _previewGpsLoading,
                latitude: _previewLat,
                longitude: _previewLng,
                failure: _previewLocationFailure,
                onRetryTap: _onPreviewGpsRetry,
              ),
            ),

          // ─── Bottom hint pill ───────────────────────────────────
          Positioned(
            left: 0,
            right: 0,
            bottom: 60,
            child: Center(
              child: _BottomHint(
                processing: _isProcessing,
                hasResult: _result != null,
              ),
            ),
          ),

          // ─── Result overlay ─────────────────────────────────────
          if (_result != null)
            _ResultOverlay(
              result: _result!,
              onPrimary: _onPrimaryAction,
            ),
        ],
      ),
    );
  }
}

// ╔════════════════════════════════════════════════════════════════╗
// ║ Scanner frame overlay                                          ║
// ╚════════════════════════════════════════════════════════════════╝

class _ScannerFrameOverlay extends StatelessWidget {
  const _ScannerFrameOverlay();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = math.min(constraints.maxWidth, constraints.maxHeight) * 0.72;
        return Stack(
          fit: StackFit.expand,
          children: [
            // Dim outside cutout
            CustomPaint(
              painter: _CutoutPainter(boxSize: size),
              child: const SizedBox.expand(),
            ),
            // Centered frame + corners + scan line
            Center(
              child: SizedBox(
                width: size,
                height: size,
                child: Stack(
                  children: [
                    // Corner brackets (orange → purple gradient via paint)
                    CustomPaint(
                      painter: _CornerBracketsPainter(),
                      size: Size(size, size),
                    ),
                    // Animated scan line
                    const Positioned.fill(
                      child: ClipRect(
                        child: _ScanLine(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _CutoutPainter extends CustomPainter {
  _CutoutPainter({required this.boxSize});
  final double boxSize;

  @override
  void paint(Canvas canvas, Size size) {
    final dim = Paint()..color = const Color(0xFF000000).withValues(alpha: 0.62);
    final hole = Rect.fromCenter(
      center: size.center(Offset.zero),
      width: boxSize,
      height: boxSize,
    );
    final outer = Path()..addRect(Offset.zero & size);
    final inner = Path()
      ..addRRect(RRect.fromRectAndRadius(hole, const Radius.circular(28)));
    final donut = Path.combine(PathOperation.difference, outer, inner);
    canvas.drawPath(donut, dim);
  }

  @override
  bool shouldRepaint(covariant _CutoutPainter old) => old.boxSize != boxSize;
}

class _CornerBracketsPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 4.0;
    const corner = 28.0;

    final shader = AppColors.neonGradient.createShader(
      Rect.fromLTWH(0, 0, size.width, size.height),
    );

    final paint = Paint()
      ..shader = shader
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    // Top-left
    canvas.drawPath(
      Path()
        ..moveTo(0, corner)
        ..lineTo(0, 0)
        ..lineTo(corner, 0),
      paint,
    );
    // Top-right
    canvas.drawPath(
      Path()
        ..moveTo(size.width - corner, 0)
        ..lineTo(size.width, 0)
        ..lineTo(size.width, corner),
      paint,
    );
    // Bottom-left
    canvas.drawPath(
      Path()
        ..moveTo(0, size.height - corner)
        ..lineTo(0, size.height)
        ..lineTo(corner, size.height),
      paint,
    );
    // Bottom-right
    canvas.drawPath(
      Path()
        ..moveTo(size.width - corner, size.height)
        ..lineTo(size.width, size.height)
        ..lineTo(size.width, size.height - corner),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

class _ScanLine extends StatefulWidget {
  const _ScanLine();
  @override
  State<_ScanLine> createState() => _ScanLineState();
}

class _ScanLineState extends State<_ScanLine>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (AppA11y.reduceMotion(context)) {
      _ctrl.stop();
      _ctrl.value = 0.45;
    } else if (!_ctrl.isAnimating) {
      _ctrl.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) {
        return LayoutBuilder(
          builder: (context, c) {
            final y = _ctrl.value * (c.maxHeight - 4);
            return Stack(
              children: [
                Positioned(
                  top: y,
                  left: 14,
                  right: 14,
                  child: Container(
                    height: 2,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [
                          Color(0x00FF6B00),
                          Color(0xFFFF6B00),
                          Color(0xFFA855F7),
                          Color(0x00A855F7),
                        ],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.accent.withValues(alpha: 0.6),
                          blurRadius: 18,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }
}

// ╔════════════════════════════════════════════════════════════════╗
// ║ Top chrome circle button                                       ║
// ╚════════════════════════════════════════════════════════════════╝

class _CircleChromeButton extends StatelessWidget {
  const _CircleChromeButton({
    required this.icon,
    required this.onTap,
    required this.semanticLabel,
    this.activeGlow = false,
  });
  final IconData icon;
  final VoidCallback onTap;
  final String semanticLabel;
  final bool activeGlow;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      child: PressScale(
        onTap: onTap,
        scale: 0.92,
        child: ClipOval(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: const Color(0xFF000000).withValues(alpha: 0.42),
                shape: BoxShape.circle,
                border: Border.all(
                  color: activeGlow
                      ? AppColors.gold.withValues(alpha: 0.85)
                      : const Color(0xFFFFFFFF).withValues(alpha: 0.18),
                  width: 1,
                ),
                boxShadow: activeGlow
                    ? [
                        BoxShadow(
                          color: AppColors.gold.withValues(alpha: 0.55),
                          blurRadius: 18,
                          spreadRadius: 1,
                        ),
                      ]
                    : null,
              ),
              child: Icon(
                icon,
                color: activeGlow ? AppColors.gold : CupertinoColors.white,
                size: 18,
                semanticLabel: semanticLabel,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ╔════════════════════════════════════════════════════════════════╗
// ║ GPS preview (compare with branch Latitude/Longitude in admin)   ║
// ╚════════════════════════════════════════════════════════════════╝

class _ScannerGpsPreview extends StatelessWidget {
  const _ScannerGpsPreview({
    required this.loading,
    required this.latitude,
    required this.longitude,
    required this.failure,
    required this.onRetryTap,
  });

  final bool loading;
  final double? latitude;
  final double? longitude;
  final CheckInLocationFailed? failure;
  final VoidCallback onRetryTap;

  String get _failureLabel {
    switch (failure?.kind) {
      case LocationIssueKind.permissionDenied:
      case LocationIssueKind.permissionDeniedForever:
        return 'Location permission needed — tap Settings';
      case LocationIssueKind.gpsOff:
        return 'GPS is off — tap to enable';
      case LocationIssueKind.noFix:
        return 'No GPS fix — tap to retry';
      case null:
        return 'GPS unavailable — tap to retry';
    }
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.pill),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFF000000).withValues(alpha: 0.45),
            borderRadius: BorderRadius.circular(AppRadius.pill),
            border: Border.all(
              color: const Color(0xFFFFFFFF).withValues(alpha: 0.10),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                CupertinoIcons.location,
                size: 14,
                color: CupertinoColors.white.withValues(alpha: 0.85),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: loading
                    ? Text(
                        'Reading GPS…',
                        style: AppType.caption.copyWith(
                          color: CupertinoColors.white.withValues(alpha: 0.9),
                        ),
                      )
                    : latitude != null && longitude != null
                        ? Text(
                            'lat ${latitude!.toStringAsFixed(6)} · lng ${longitude!.toStringAsFixed(6)}',
                            style: AppType.caption.copyWith(
                              color: CupertinoColors.white.withValues(alpha: 0.92),
                              fontWeight: FontWeight.w500,
                            ),
                          )
                        : Text(
                            _failureLabel,
                            style: AppType.caption.copyWith(
                              color: CupertinoColors.white.withValues(alpha: 0.75),
                            ),
                          ),
              ),
              if (!loading) ...[
                const SizedBox(width: 6),
                Semantics(
                  button: true,
                  label: 'Retry location or open settings',
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(
                      minWidth: AppA11y.minTouchTarget,
                      minHeight: AppA11y.minTouchTarget,
                    ),
                    child: PressScale(
                      onTap: onRetryTap,
                      scale: 0.94,
                      child: Icon(
                        CupertinoIcons.arrow_clockwise,
                        size: 18,
                        color: CupertinoColors.white.withValues(alpha: 0.85),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ╔════════════════════════════════════════════════════════════════╗
// ║ Bottom hint pill                                               ║
// ╚════════════════════════════════════════════════════════════════╝

class _BottomHint extends StatelessWidget {
  const _BottomHint({required this.processing, required this.hasResult});
  final bool processing;
  final bool hasResult;

  @override
  Widget build(BuildContext context) {
    if (hasResult) return const SizedBox.shrink();
    final label = processing ? 'Checking you in…' : 'Align the QR inside the frame';
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.pill),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFF000000).withValues(alpha: 0.45),
            borderRadius: BorderRadius.circular(AppRadius.pill),
            border: Border.all(
              color: const Color(0xFFFFFFFF).withValues(alpha: 0.10),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (processing) ...[
                const CupertinoActivityIndicator(
                    color: CupertinoColors.white, radius: 8),
                const SizedBox(width: 8),
              ] else ...[
                const Icon(CupertinoIcons.qrcode_viewfinder,
                    color: CupertinoColors.white, size: 16),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: AppType.footnote.copyWith(
                  color: CupertinoColors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ╔════════════════════════════════════════════════════════════════╗
// ║ Result overlay (5 states)                                      ║
// ╚════════════════════════════════════════════════════════════════╝

class _ResultOverlay extends StatelessWidget {
  const _ResultOverlay({
    required this.result,
    required this.onPrimary,
  });
  final AttendanceResult result;
  final Future<void> Function(CheckInNextAction action) onPrimary;

  @override
  Widget build(BuildContext context) {
    final r = result;
    final feedback = CheckInFeedback.fromResult(r);
    final IconData icon;
    final Color tint;
    final title = feedback.title;
    final body = feedback.reason;
    final celebratory = feedback.celebratory;
    final ctaLabel = feedback.nextActionLabel;
    final cta = ctaLabel == null
        ? null
        : () {
            onPrimary(feedback.nextAction);
          };

    if (r is AttendanceSuccess) {
      icon = CupertinoIcons.checkmark_alt;
      tint = AppColors.success;
    } else if (r is AttendanceMembershipExpired) {
      icon = CupertinoIcons.exclamationmark_triangle;
      tint = AppColors.gold;
    } else if (r is AttendanceAlreadyScanned) {
      icon = CupertinoIcons.clock;
      tint = AppColors.neonBlueLite;
    } else if (r is AttendanceTooFar) {
      icon = CupertinoIcons.map;
      tint = AppColors.danger;
    } else if (r is AttendanceRateLimited) {
      icon = CupertinoIcons.timer;
      tint = AppColors.gold;
    } else if (r is AttendanceCameraIssue) {
      icon = CupertinoIcons.camera;
      tint = AppColors.gold;
    } else if (r is AttendanceInvalidQr) {
      icon = CupertinoIcons.xmark_octagon;
      tint = AppColors.danger;
    } else if (r is AttendanceLocationIssue) {
      icon = CupertinoIcons.location_fill;
      tint = AppColors.gold;
    } else if (r is AttendanceSessionIssue || r is AttendanceAccessDenied) {
      icon = CupertinoIcons.lock_fill;
      tint = AppColors.danger;
    } else {
      icon = CupertinoIcons.wifi_exclamationmark;
      tint = AppColors.danger;
    }

    return Positioned.fill(
      child: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
          child: Container(
            color: const Color(0xFF000000).withValues(alpha: 0.45),
            child: Stack(
              children: [
                if (celebratory)
                  const Positioned.fill(child: _ConfettiBurst()),
                Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: GlassCard(
                      padding: const EdgeInsets.fromLTRB(24, 28, 24, 22),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _ResultBadge(icon: icon, tint: tint, pulse: celebratory),
                          const SizedBox(height: AppSpacing.lg),
                          Text(
                            title,
                            textAlign: TextAlign.center,
                            style: AppType.title2.copyWith(
                              color: AppColors.resolveText(context),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            body,
                            textAlign: TextAlign.center,
                            style: AppType.body.copyWith(
                              color: AppColors.resolveTextSecondary(context),
                              height: 1.4,
                            ),
                          ),
                          if (_coordsCaption(r) != null) ...[
                            const SizedBox(height: 10),
                            Text(
                              _coordsCaption(r)!,
                              textAlign: TextAlign.center,
                              style: AppType.caption.copyWith(
                                color: AppColors.resolveTextSecondary(context),
                                height: 1.35,
                              ),
                            ),
                          ],
                          if (ctaLabel != null) ...[
                            const SizedBox(height: AppSpacing.lg),
                            PressScale(
                              onTap: cta,
                                child: Container(
                                width: double.infinity,
                                constraints: const BoxConstraints(minHeight: 48),
                                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  gradient: AppColors.primaryGradient,
                                  borderRadius:
                                      BorderRadius.circular(AppRadius.lg),
                                  boxShadow: AppColors.orangeGlow(
                                      opacity: 0.4, blur: 18),
                                ),
                                child: Text(
                                  ctaLabel,
                                  textAlign: TextAlign.center,
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppType.button.copyWith(
                                    color: CupertinoColors.white,
                                  ),
                                ),
                              ),
                            ),
                          ] else
                            Padding(
                              padding: const EdgeInsets.only(top: AppSpacing.md),
                              child: Text(
                                'Closing automatically…',
                                style: AppType.caption.copyWith(
                                  color:
                                      AppColors.resolveTextSecondary(context),
                                ),
                              ),
                            ),
                        ],
                      ),
                    )
                        .animate()
                        .fadeIn(duration: 220.ms)
                        .slideY(begin: 0.06, end: 0, curve: Curves.easeOutCubic)
                        .scale(
                          begin: const Offset(0.96, 0.96),
                          end: const Offset(1, 1),
                          duration: 320.ms,
                          curve: Curves.easeOutBack,
                        ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ResultBadge extends StatelessWidget {
  const _ResultBadge({
    required this.icon,
    required this.tint,
    required this.pulse,
  });
  final IconData icon;
  final Color tint;
  final bool pulse;

  @override
  Widget build(BuildContext context) {
    final ring = Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            tint.withValues(alpha: 0.95),
            tint.withValues(alpha: 0.55),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: tint.withValues(alpha: 0.55),
            blurRadius: 28,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Icon(icon, color: CupertinoColors.white, size: 40),
    );

    if (!pulse) return ring;

    return ring
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .scaleXY(
          begin: 1,
          end: 1.07,
          duration: 1100.ms,
          curve: Curves.easeInOut,
        );
  }
}

// ╔════════════════════════════════════════════════════════════════╗
// ║ Confetti burst (custom paint, no extra deps)                   ║
// ╚════════════════════════════════════════════════════════════════╝

class _ConfettiBurst extends StatefulWidget {
  const _ConfettiBurst();
  @override
  State<_ConfettiBurst> createState() => _ConfettiBurstState();
}

class _ConfettiBurstState extends State<_ConfettiBurst>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final List<_ConfettiParticle> _particles;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..forward();
    final rng = math.Random();
    final palette = <Color>[
      AppColors.accent,
      AppColors.gold,
      AppColors.accentBright,
      AppColors.neonPurple,
      AppColors.neonBlueLite,
      AppColors.success,
    ];
    _particles = List.generate(48, (_) {
      final angle = rng.nextDouble() * math.pi * 2;
      final speed = 220 + rng.nextDouble() * 320;
      return _ConfettiParticle(
        color: palette[rng.nextInt(palette.length)],
        vx: math.cos(angle) * speed,
        vy: math.sin(angle) * speed - 240,
        rotation: rng.nextDouble() * math.pi * 2,
        rotSpeed: (rng.nextDouble() - 0.5) * 6,
        size: 6 + rng.nextDouble() * 6,
      );
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) => CustomPaint(
        painter: _ConfettiPainter(
          particles: _particles,
          t: _ctrl.value,
        ),
      ),
    );
  }
}

class _ConfettiParticle {
  _ConfettiParticle({
    required this.color,
    required this.vx,
    required this.vy,
    required this.rotation,
    required this.rotSpeed,
    required this.size,
  });
  final Color color;
  final double vx, vy;
  final double rotation;
  final double rotSpeed;
  final double size;
}

class _ConfettiPainter extends CustomPainter {
  _ConfettiPainter({required this.particles, required this.t});
  final List<_ConfettiParticle> particles;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    final origin = Offset(size.width / 2, size.height / 2);
    const gravity = 600.0;
    final paint = Paint();
    for (final p in particles) {
      final fade = (1 - t).clamp(0.0, 1.0);
      final dx = p.vx * t;
      final dy = p.vy * t + 0.5 * gravity * t * t;
      final pos = origin + Offset(dx, dy);
      final rot = p.rotation + p.rotSpeed * t;
      paint.color = p.color.withValues(alpha: 0.92 * fade);
      canvas.save();
      canvas.translate(pos.dx, pos.dy);
      canvas.rotate(rot);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(center: Offset.zero, width: p.size, height: p.size * 0.45),
          const Radius.circular(1.6),
        ),
        paint,
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _ConfettiPainter old) => old.t != t;
}

// ╔════════════════════════════════════════════════════════════════╗
// ║ Camera-error fallback                                          ║
// ╚════════════════════════════════════════════════════════════════╝

class _ScannerError extends StatelessWidget {
  const _ScannerError({required this.message, this.onOpenSettings});
  final String message;
  final VoidCallback? onOpenSettings;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF000000),
      alignment: Alignment.center,
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(CupertinoIcons.camera,
              color: CupertinoColors.white, size: 36),
          const SizedBox(height: 12),
          Text(
            'Camera unavailable',
            textAlign: TextAlign.center,
            style: AppType.title3.copyWith(color: CupertinoColors.white),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: AppType.footnote.copyWith(
              color: CupertinoColors.white.withValues(alpha: 0.85),
              height: 1.4,
            ),
          ),
          if (onOpenSettings != null) ...[
            const SizedBox(height: 20),
            AppButton(
              label: 'Open settings',
              onTap: onOpenSettings,
            ),
            const SizedBox(height: 8),
            AppButton(
              label: 'Not now',
              style: AppButtonStyle.plain,
              onTap: () => Navigator.maybePop(context),
            ),
          ],
        ],
      ),
    );
  }
}

String? _coordsCaption(AttendanceResult r) {
  double? lat;
  double? lng;
  if (r is AttendanceTooFar) {
    lat = r.deviceLatitude;
    lng = r.deviceLongitude;
  } else if (r is AttendanceInvalidQr) {
    lat = r.deviceLatitude;
    lng = r.deviceLongitude;
  }
  if (lat == null || lng == null) return null;
  return 'Sent to server (WGS84)\n'
      'lat ${lat.toStringAsFixed(6)}\n'
      'lng ${lng.toStringAsFixed(6)}';
}
