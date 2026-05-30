import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../theme/app_typography.dart';

enum SwipeToCompleteState { idle, dragging, loading, completed, error }

/// Premium swipe-right-to-complete control — no tap-to-complete.
class SwipeToCompleteSetWidget extends StatefulWidget {
  const SwipeToCompleteSetWidget({
    super.key,
    required this.enabled,
    required this.isLoading,
    required this.isCompleted,
    required this.validationError,
    required this.onCompleteSwipe,
  });

  final bool enabled;
  final bool isLoading;
  final bool isCompleted;
  final String? validationError;
  final Future<void> Function() onCompleteSwipe;

  @override
  State<SwipeToCompleteSetWidget> createState() => _SwipeToCompleteSetWidgetState();
}

class _SwipeToCompleteSetWidgetState extends State<SwipeToCompleteSetWidget>
    with SingleTickerProviderStateMixin {
  static const _completeThreshold = 0.72;

  double _dragProgress = 0;
  SwipeToCompleteState _state = SwipeToCompleteState.idle;
  late AnimationController _successController;

  @override
  void initState() {
    super.initState();
    _successController = AnimationController(vsync: this, duration: const Duration(milliseconds: 520));
    if (widget.isCompleted) {
      _state = SwipeToCompleteState.completed;
      _successController.value = 1;
    }
  }

  @override
  void didUpdateWidget(covariant SwipeToCompleteSetWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isCompleted && _state != SwipeToCompleteState.completed) {
      _state = SwipeToCompleteState.completed;
      _successController.forward(from: 0);
    }
    if (widget.isLoading && _state != SwipeToCompleteState.loading) {
      setState(() => _state = SwipeToCompleteState.loading);
    }
    if (!widget.isLoading && _state == SwipeToCompleteState.loading && !widget.isCompleted) {
      setState(() => _state = SwipeToCompleteState.idle);
    }
  }

  @override
  void dispose() {
    _successController.dispose();
    super.dispose();
  }

  Future<void> _finishSwipe() async {
    if (!widget.enabled || widget.isCompleted || widget.isLoading) return;

    if (widget.validationError != null) {
      HapticFeedback.heavyImpact();
      setState(() {
        _state = SwipeToCompleteState.error;
        _dragProgress = 0;
      });
      return;
    }

    setState(() {
      _state = SwipeToCompleteState.loading;
      _dragProgress = 1;
    });

    try {
      await widget.onCompleteSwipe();
      if (!mounted) return;
      HapticFeedback.mediumImpact();
      await _successController.forward(from: 0);
      if (!mounted) return;
      setState(() => _state = SwipeToCompleteState.completed);
    } catch (_) {
      if (!mounted) return;
      HapticFeedback.heavyImpact();
      setState(() {
        _state = SwipeToCompleteState.error;
        _dragProgress = 0;
      });
    }
  }

  void _onDragUpdate(DragUpdateDetails details, double trackWidth) {
    if (!widget.enabled || widget.isCompleted || widget.isLoading) return;
    final delta = details.delta.dx / (trackWidth * 0.85);
    setState(() {
      _dragProgress = (_dragProgress + delta).clamp(0.0, 1.0);
      _state = SwipeToCompleteState.dragging;
      if (_dragProgress >= 0.35 && _dragProgress < _completeThreshold) {
        HapticFeedback.selectionClick();
      }
    });
  }

  void _onDragEnd(DragEndDetails details) {
    if (!widget.enabled || widget.isCompleted || widget.isLoading) return;
    if (_dragProgress >= _completeThreshold) {
      unawaited(_finishSwipe());
      return;
    }
    setState(() {
      _dragProgress = 0;
      _state = widget.validationError != null ? SwipeToCompleteState.error : SwipeToCompleteState.idle;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_state == SwipeToCompleteState.completed || widget.isCompleted) {
      return _CompletedTrack(success: _successController);
    }

    final isError = _state == SwipeToCompleteState.error || widget.validationError != null;
    final showProgressHint = _dragProgress >= 0.35 && _dragProgress < _completeThreshold;
    final label = widget.isLoading
        ? 'Saving set…'
        : showProgressHint
            ? 'Keep swiping →'
            : 'Swipe right to complete set';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (isError && widget.validationError != null)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.xs),
            child: Text(
              widget.validationError!,
              style: AppType.caption.copyWith(color: AppColors.danger),
            ),
          ),
        LayoutBuilder(
          builder: (context, constraints) {
            final trackWidth = constraints.maxWidth;
            final knobTravel = (trackWidth - 52).clamp(0.0, double.infinity);
            return GestureDetector(
              onHorizontalDragUpdate: (d) => _onDragUpdate(d, trackWidth),
              onHorizontalDragEnd: _onDragEnd,
              child: Container(
                height: 52,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(26),
                  gradient: LinearGradient(
                    colors: [
                      AppColors.surfaceDark.withValues(alpha: 0.9),
                      AppColors.surfaceDarkAlt.withValues(alpha: 0.85),
                    ],
                  ),
                  border: Border.all(
                    color: isError
                        ? AppColors.danger.withValues(alpha: 0.55)
                        : AppColors.accent.withValues(alpha: 0.25 + _dragProgress * 0.35),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.accent.withValues(alpha: 0.08 + _dragProgress * 0.12),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Stack(
                  alignment: Alignment.centerLeft,
                  children: [
                    Positioned.fill(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 56),
                        child: Align(
                          alignment: Alignment.center,
                          child: Text(
                            label,
                            style: AppType.footnote.copyWith(
                              color: AppColors.textDarkSecondary,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Positioned.fill(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: FractionallySizedBox(
                          widthFactor: _dragProgress.clamp(0.05, 1.0),
                          child: Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(26),
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.accent.withValues(alpha: 0.35),
                                  AppColors.gold.withValues(alpha: 0.2),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    AnimatedPositioned(
                      duration: _state == SwipeToCompleteState.dragging
                          ? Duration.zero
                          : const Duration(milliseconds: 280),
                      curve: Curves.easeOutCubic,
                      left: 4 + knobTravel * _dragProgress,
                      top: 4,
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: AppColors.primaryGradient,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.accent.withValues(alpha: 0.45),
                              blurRadius: 12,
                            ),
                          ],
                        ),
                        child: widget.isLoading
                            ? const Center(
                                child: CupertinoActivityIndicator(radius: 9, color: CupertinoColors.white),
                              )
                            : Icon(
                                CupertinoIcons.arrow_right,
                                color: CupertinoColors.white.withValues(alpha: 0.95),
                                size: 20,
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

class _CompletedTrack extends StatelessWidget {
  const _CompletedTrack({required this.success});

  final AnimationController success;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 52,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        color: AppColors.success.withValues(alpha: 0.12),
        border: Border.all(color: AppColors.success.withValues(alpha: 0.45)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          ScaleTransition(
            scale: CurvedAnimation(parent: success, curve: Curves.elasticOut),
            child: Container(
              width: 28,
              height: 28,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.success,
              ),
              child: const Icon(CupertinoIcons.checkmark, color: CupertinoColors.black, size: 16),
            ),
          )
              .animate(controller: success)
              .fadeIn(duration: 220.ms),
          const SizedBox(width: 10),
          Text(
            'Set completed',
            style: AppType.footnote.copyWith(
              color: AppColors.success,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}
