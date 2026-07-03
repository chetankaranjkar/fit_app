import 'dart:io';

import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/api_exception.dart';
import '../../core/formatters.dart';
import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../services/me_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/progress_ring.dart';
import '../../widgets/premium_background.dart';
import '../shell/shell_layout_metrics.dart';
import '../../widgets/skeleton_shimmer.dart';

class MembershipScreen extends ConsumerWidget {
  const MembershipScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membership = ref.watch(membershipProvider);
    final invoices = ref.watch(invoicesProvider);
    final billingAccess = ref.watch(billingAccessProvider);
    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            bottom: false,
            child: CustomScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          slivers: [
            const CupertinoSliverNavigationBar(
              largeTitle: Text('Membership'),
              border: null,
            ),
            CupertinoSliverRefreshControl(
              onRefresh: () async {
                ref.invalidate(membershipProvider);
                ref.invalidate(invoicesProvider);
                ref.invalidate(billingAccessProvider);
                await ref.read(membershipProvider.future);
              },
            ),
            SliverPadding(
              padding: ShellLayoutMetrics.scrollPadding(context),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  membership.when(
                    loading: () => const SkeletonBlock(height: 260),
                    error: (e, _) => ErrorStateView(
                      message: e.toString(),
                      onRetry: () => ref.refresh(membershipProvider),
                    ),
                    data: (data) => data == null
                        ? const EmptyState(
                            title: 'No active membership',
                            message: 'Contact the gym front desk to activate one.',
                            icon: CupertinoIcons.creditcard,
                          )
                        : _MembershipDetail(membership: data),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  billingAccess.when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (access) => access.hasPendingBalance
                        ? _PendingBillingCard(access: access)
                        : const SizedBox.shrink(),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  invoices.when(
                    loading: () => const SkeletonBlock(height: 140),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (rows) => _InvoicesSection(invoices: rows),
                  ),
                ]),
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

class _MembershipDetail extends StatelessWidget {
  const _MembershipDetail({required this.membership});
  final MeMembership membership;

  @override
  Widget build(BuildContext context) {
    final daysTotal =
        membership.durationDays ?? membership.endDate.difference(membership.startDate).inDays;
    final daysUsed =
        (daysTotal - membership.daysRemaining).clamp(0, daysTotal == 0 ? 1 : daysTotal);
    final progress = daysTotal == 0 ? 0.0 : (daysUsed / daysTotal).clamp(0.0, 1.0);
    final isExpiring = membership.isExpiringSoon;
    final goldColor = isExpiring ? AppColors.orange : AppColors.gold;

    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.xl),
          child: Container(
            decoration: BoxDecoration(
              gradient: isExpiring
                  ? const LinearGradient(
                      colors: [Color(0xFF3D1800), Color(0xFF7A3000), Color(0xFF3D1800)],
                      stops: [0.0, 0.55, 1.0],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : AppColors.goldGradient,
              borderRadius: BorderRadius.circular(AppRadius.xl),
              boxShadow: [
                BoxShadow(
                  color: goldColor.withValues(alpha: 0.40),
                  blurRadius: 30,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Stack(
              children: [
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: AppColors.goldShimmer,
                      borderRadius: BorderRadius.circular(AppRadius.xl),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.xl),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(CupertinoIcons.creditcard_fill, color: goldColor, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            membership.status.toUpperCase(),
                            style: AppType.caption.copyWith(
                              color: goldColor,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.5,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      Text(
                        membership.planName,
                        style: AppType.title1.copyWith(
                          color: CupertinoColors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      if (membership.price != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          Fmt.currency(membership.price!),
                          style: AppType.body.copyWith(
                            color: goldColor.withValues(alpha: 0.80),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.xl),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          ProgressRing(
                            progress: progress,
                            label: 'used',
                            valueText: '${(progress * 100).round()}%',
                            color: goldColor,
                          ),
                          const SizedBox(width: AppSpacing.xl),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _CardRow(label: 'Start', value: Fmt.date(membership.startDate)),
                                const SizedBox(height: 8),
                                _CardRow(label: 'End', value: Fmt.date(membership.endDate)),
                                const SizedBox(height: 8),
                                _CardRow(
                                  label: 'Days left',
                                  value: membership.daysRemaining < 0
                                      ? '0'
                                      : membership.daysRemaining.toString(),
                                  highlight: isExpiring ? AppColors.orange : goldColor,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        if (isExpiring) ...[
          const SizedBox(height: AppSpacing.lg),
          GlassCard(
            tint: AppColors.danger.withValues(alpha: 0.12),
            child: Row(
              children: [
                const Icon(
                  CupertinoIcons.exclamationmark_triangle_fill,
                  color: AppColors.danger,
                  size: 20,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Text(
                    'Renew at the front desk before check-in is blocked.',
                    style: AppType.footnote.copyWith(
                      color: AppColors.resolveTextSecondary(context),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _CardRow extends StatelessWidget {
  const _CardRow({required this.label, required this.value, this.highlight});
  final String label;
  final String value;
  final Color? highlight;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: AppType.footnote.copyWith(
            color: CupertinoColors.white.withValues(alpha: 0.60),
          ),
        ),
        Text(
          value,
          style: AppType.callout.copyWith(
            color: highlight ?? CupertinoColors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _InvoicesSection extends StatelessWidget {
  const _InvoicesSection({required this.invoices});
  final List<MeInvoiceSummary> invoices;

  @override
  Widget build(BuildContext context) {
    if (invoices.isEmpty) {
      return const EmptyState(
        title: 'No billing history',
        message: 'Receipts and invoices appear here after your first payment.',
        icon: CupertinoIcons.doc_text,
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Billing & receipts',
          style: AppType.title3.copyWith(color: AppColors.resolveText(context)),
        ),
        const SizedBox(height: AppSpacing.md),
        for (final invoice in invoices)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: _InvoiceCard(invoice: invoice),
          ),
      ],
    );
  }
}

class _InvoiceCard extends StatefulWidget {
  const _InvoiceCard({required this.invoice});
  final MeInvoiceSummary invoice;

  @override
  State<_InvoiceCard> createState() => _InvoiceCardState();
}

class _InvoiceCardState extends State<_InvoiceCard> {
  bool _downloading = false;

  Future<void> _openPdf() async {
    if (_downloading || !widget.invoice.hasPdf) return;
    setState(() => _downloading = true);
    try {
      final bytes = await MeService.instance.downloadInvoicePdf(widget.invoice.membershipPaymentId);
      final dir = await getTemporaryDirectory();
      final file = File(
        '${dir.path}/invoice-${widget.invoice.membershipPaymentId}.pdf',
      );
      await file.writeAsBytes(bytes, flush: true);
      await OpenFilex.open(file.path);
    } on ApiException catch (e) {
      if (!mounted) return;
      await showCupertinoDialog<void>(
        context: context,
        builder: (ctx) => CupertinoAlertDialog(
          title: const Text('Could not open invoice'),
          content: Text(e.message),
          actions: [
            CupertinoDialogAction(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final invoice = widget.invoice;
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      invoice.planName,
                      style: AppType.headline.copyWith(color: AppColors.resolveText(context)),
                    ),
                    Text(
                      invoice.invoiceNumber ?? invoice.paymentNumber,
                      style: AppType.caption.copyWith(
                        color: AppColors.resolveTextSecondary(context),
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                invoice.paymentStatus,
                style: AppType.caption.copyWith(
                  color: invoice.isPaid ? AppColors.success : AppColors.orange,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Text(
                'Paid ${Fmt.currency(invoice.paidAmount)}',
                style: AppType.body.copyWith(color: AppColors.resolveText(context)),
              ),
              if (invoice.pendingAmount > 0) ...[
                const SizedBox(width: AppSpacing.sm),
                Text(
                  '· Due ${Fmt.currency(invoice.pendingAmount)}',
                  style: AppType.body.copyWith(color: AppColors.orange),
                ),
              ],
            ],
          ),
          if (invoice.receipts.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Latest receipt ${invoice.receipts.first.receiptNumber}',
              style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
            ),
          ],
          if (invoice.hasPdf) ...[
            const SizedBox(height: AppSpacing.md),
            CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: _downloading ? null : _openPdf,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_downloading)
                    const CupertinoActivityIndicator(radius: 8)
                  else
                    const Icon(CupertinoIcons.doc_on_doc, size: 16, color: AppColors.accent),
                  const SizedBox(width: 6),
                  Text(
                    _downloading ? 'Opening…' : 'View invoice PDF',
                    style: AppType.callout.copyWith(color: AppColors.accent),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PendingBillingCard extends StatelessWidget {
  const _PendingBillingCard({required this.access});

  final MeBillingAccess access;

  Future<void> _showPayInfo(BuildContext context) async {
    await showCupertinoDialog<void>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Pay membership'),
        content: Text(
          access.message ??
              'Your balance is ${Fmt.currency(access.pendingAmount ?? 0)}. '
              'Complete payment on the member web portal or at the front desk.',
        ),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(CupertinoIcons.money_dollar_circle_fill, color: AppColors.orange, size: 18),
              const SizedBox(width: 8),
              Text(
                'Payment due',
                style: AppType.headline.copyWith(
                  color: AppColors.resolveText(context),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            Fmt.currency(access.pendingAmount ?? 0),
            style: AppType.title2.copyWith(
              color: AppColors.orange,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (access.nextDueDate != null) ...[
            const SizedBox(height: 4),
            Text(
              'Due ${Fmt.date(access.nextDueDate!)}',
              style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: double.infinity,
            child: CupertinoButton.filled(
              padding: const EdgeInsets.symmetric(vertical: 12),
              onPressed: () => _showPayInfo(context),
              child: const Text('Renew / pay'),
            ),
          ),
        ],
      ),
    );
  }
}

class _PerkTile extends StatelessWidget {
  const _PerkTile({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.lg),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(
                color: color.withValues(alpha: 0.30),
                width: 0.8,
              ),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: AppType.caption.copyWith(
              color: AppColors.resolveText(context),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
