import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../core/formatters.dart';
import '../../models/online_payment_models.dart';
import '../../providers/me_providers.dart';
import '../../services/online_payment_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/app_button.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import 'online_payment_checkout.dart';
import 'razorpay_native_checkout.dart';

class BillingPaySection extends ConsumerStatefulWidget {
  const BillingPaySection({super.key});

  @override
  ConsumerState<BillingPaySection> createState() => _BillingPaySectionState();
}

class _BillingPaySectionState extends ConsumerState<BillingPaySection>
    with WidgetsBindingObserver {
  late final OnlinePaymentCheckout _checkout = OnlinePaymentCheckout(
    api: OnlinePaymentService.instance,
    gateway: NativeRazorpayCheckout(),
  );

  bool _paying = false;
  bool _polling = false;
  String? _confirmingOrderId;
  String? _notice;
  Color? _noticeColor;
  String? _error;
  String? _resumedOrderId;
  bool _resumeQueued = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    // Interrupted checkout: trust server status, not a local success flag.
    _resumedOrderId = null;
    ref.invalidate(onlinePaymentSummaryProvider);
    ref.invalidate(invoicesProvider);
    ref.invalidate(membershipProvider);
    ref.invalidate(billingAccessProvider);
  }

  Future<void> _refreshBilling() async {
    ref.invalidate(onlinePaymentSummaryProvider);
    ref.invalidate(invoicesProvider);
    ref.invalidate(membershipProvider);
    ref.invalidate(billingAccessProvider);
    await ref.read(onlinePaymentSummaryProvider.future);
  }

  void _applyOutcome(OnlinePaymentOutcome outcome) {
    setState(() {
      _confirmingOrderId =
          outcome.kind == OnlinePaymentOutcomeKind.confirming ? outcome.orderId : null;
      _notice = outcome.message;
      _noticeColor = switch (outcome.kind) {
        OnlinePaymentOutcomeKind.completed => AppColors.success,
        OnlinePaymentOutcomeKind.confirming || OnlinePaymentOutcomeKind.review => AppColors.orange,
        OnlinePaymentOutcomeKind.failed => AppColors.danger,
        _ => AppColors.resolveTextSecondary(context),
      };
    });
  }

  Future<void> _confirm(String orderId) async {
    setState(() => _polling = true);
    try {
      final outcome = await _checkout.waitForConfirmation(orderId);
      if (!mounted) return;
      _applyOutcome(outcome);
      if (outcome.kind != OnlinePaymentOutcomeKind.cancelled) {
        await _refreshBilling();
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _polling = false);
    }
  }

  Future<void> _maybeResume(MemberOnlinePaymentSummary summary) async {
    final attempt = summary.latestAttempt;
    if (_paying || _polling) return;
    if (attempt == null || _resumedOrderId == attempt.orderId) return;
    final kind = outcomeKindFromStatus(attempt.status);
    final recentlyCompleted = kind == OnlinePaymentOutcomeKind.completed &&
        DateTime.now().difference(attempt.updatedDate ?? attempt.createdDate).inMinutes < 10;
    if (kind != OnlinePaymentOutcomeKind.confirming &&
        kind != OnlinePaymentOutcomeKind.review &&
        !recentlyCompleted) {
      return;
    }
    _resumedOrderId = attempt.orderId;
    _applyOutcome(
      OnlinePaymentOutcome(kind: kind, message: attempt.message, orderId: attempt.orderId),
    );
    if (kind == OnlinePaymentOutcomeKind.confirming) {
      await _confirm(attempt.orderId);
    }
  }

  Future<void> _pay(MemberOnlinePaymentSummary summary) async {
    if (_paying || _polling) return;
    setState(() {
      _error = null;
      _notice = null;
      _paying = true;
    });
    try {
      final outcome = await _checkout.payOutstanding(
        membershipPaymentId: summary.membershipPaymentId,
      );
      _resumedOrderId = outcome.orderId;
      if (!mounted) return;
      _applyOutcome(outcome);
      await _refreshBilling();
      if (outcome.kind == OnlinePaymentOutcomeKind.confirming) {
        await _confirm(outcome.orderId);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
      await _refreshBilling();
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  Future<void> _checkStatus() async {
    final orderId = _confirmingOrderId;
    if (orderId == null || _polling) return;
    setState(() {
      _error = null;
      _polling = true;
    });
    try {
      final outcome = await _checkout.checkStatus(orderId);
      if (!mounted) return;
      _applyOutcome(outcome);
      if (outcome.kind != OnlinePaymentOutcomeKind.pending) {
        await _refreshBilling();
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _polling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final summaryAsync = ref.watch(onlinePaymentSummaryProvider);
    return summaryAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (e, _) => ErrorStateView(
        message: e.toString(),
        onRetry: () => ref.refresh(onlinePaymentSummaryProvider),
      ),
      data: (summary) {
        if (!_resumeQueued) {
          _resumeQueued = true;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _resumeQueued = false;
            if (mounted) _maybeResume(summary);
          });
        }
        final presentation = BillingPayPresentation.fromSummary(summary);
        if (!presentation.visible && _notice == null && _error == null) {
          return const SizedBox.shrink();
        }
        return _BillingPayCard(
          summary: summary,
          presentation: presentation,
          paying: _paying,
          polling: _polling,
          confirmingOrderId: _confirmingOrderId,
          notice: _notice,
          noticeColor: _noticeColor,
          error: _error,
          onPay: () => _pay(summary),
          onCheckStatus: _checkStatus,
        );
      },
    );
  }
}

class _BillingPayCard extends StatelessWidget {
  const _BillingPayCard({
    required this.summary,
    required this.presentation,
    required this.paying,
    required this.polling,
    required this.confirmingOrderId,
    required this.notice,
    required this.noticeColor,
    required this.error,
    required this.onPay,
    required this.onCheckStatus,
  });

  final MemberOnlinePaymentSummary summary;
  final BillingPayPresentation presentation;
  final bool paying;
  final bool polling;
  final String? confirmingOrderId;
  final String? notice;
  final Color? noticeColor;
  final String? error;
  final VoidCallback onPay;
  final VoidCallback onCheckStatus;

  @override
  Widget build(BuildContext context) {
    final busy = paying || polling || confirmingOrderId != null;
    return GlassCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                presentation.isRenewal
                    ? CupertinoIcons.calendar
                    : CupertinoIcons.money_dollar_circle_fill,
                color: AppColors.orange,
                size: 18,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  presentation.visible ? presentation.title : 'Payment',
                  style: AppType.headline.copyWith(
                    color: AppColors.resolveText(context),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          if (presentation.isOutstanding) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              Fmt.currency(summary.outstandingAmount),
              style: AppType.title2.copyWith(
                color: AppColors.orange,
                fontWeight: FontWeight.w800,
              ),
            ),
            if (summary.nextDueDate != null) ...[
              const SizedBox(height: 4),
              Text(
                'Due ${Fmt.date(summary.nextDueDate!)}',
                style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
              ),
            ],
            if (summary.planName != null && summary.planName!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                summary.planName!,
                style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
              ),
            ],
          ],
          const SizedBox(height: AppSpacing.sm),
          Text(
            presentation.body.isNotEmpty
                ? presentation.body
                : (notice ?? ''),
            style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
          ),
          if (presentation.isRenewal && summary.membershipEndDate != null) ...[
            const SizedBox(height: 4),
            Text(
              '${summary.planName ?? 'Membership'} ended ${Fmt.date(summary.membershipEndDate!)}.',
              style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
            ),
          ],
          if (presentation.showPayButton) ...[
            const SizedBox(height: AppSpacing.md),
            if (presentation.payEnabled)
              AppButton(
                label: paying
                    ? 'Waiting for checkout…'
                    : confirmingOrderId != null
                        ? 'Confirming payment…'
                        : '${presentation.payButtonLabel} ${Fmt.currency(summary.outstandingAmount)}',
                onTap: busy ? null : onPay,
              )
            else
              Text(
                presentation.unavailableReason ??
                    'Online payments are not enabled. Please contact the front desk to complete payment.',
                style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
              ),
          ],
          if (notice != null && notice!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              notice!,
              style: AppType.footnote.copyWith(color: noticeColor ?? AppColors.resolveText(context)),
            ),
          ],
          if (confirmingOrderId != null && !polling) ...[
            const SizedBox(height: AppSpacing.sm),
            CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: onCheckStatus,
              child: Text(
                'Check payment status',
                style: AppType.callout.copyWith(color: AppColors.accent),
              ),
            ),
          ],
          if (error != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              error!,
              style: AppType.footnote.copyWith(color: AppColors.danger),
            ),
          ],
        ],
      ),
    );
  }
}
