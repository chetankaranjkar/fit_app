import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/external_links.dart';
import '../../models/support_models.dart';
import '../../providers/me_providers.dart';
import '../../services/support_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/apple_grouped_list.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/press_scale.dart';
import '../../widgets/premium_background.dart';
import 'in_app_web_screen.dart';

class HelpSupportScreen extends ConsumerWidget {
  const HelpSupportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final supportAsync = ref.watch(memberSupportProvider);
    final articlesAsync = ref.watch(helpArticlesProvider);
    final compileLinks = ref.watch(compileTimeLegalLinksProvider);
    final opener = ref.watch(externalLinkOpenerProvider);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Help & support'),
        leading: CupertinoNavigationBarBackButton(
          onPressed: () => context.pop(),
        ),
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: supportAsync.when(
              loading: () => const Center(child: CupertinoActivityIndicator()),
              error: (e, _) => ListView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                children: [
                  ErrorStateView(
                    message: 'Help could not be loaded. Check your connection and try again.',
                    onRetry: () {
                      ref.invalidate(memberSupportProvider);
                      ref.invalidate(helpArticlesProvider);
                    },
                  ),
                ],
              ),
              data: (support) {
                final helpUrl = SupportService.mergeHelpUrl(
                  support,
                  compileLinks.helpCenterUrl,
                );
                final articles = articlesAsync.asData?.value ?? const <HelpArticleSummary>[];
                final articlesFailed = articlesAsync.hasError;
                final configured = helpUrl != null || support.hasContact || articles.isNotEmpty;

                return CustomScrollView(
                  physics: const BouncingScrollPhysics(
                    parent: AlwaysScrollableScrollPhysics(),
                  ),
                  slivers: [
                    CupertinoSliverRefreshControl(
                      onRefresh: () async {
                        ref.invalidate(memberSupportProvider);
                        ref.invalidate(helpArticlesProvider);
                        await Future.wait([
                          ref.read(memberSupportProvider.future),
                          ref.read(helpArticlesProvider.future).catchError((_) => <HelpArticleSummary>[]),
                        ]);
                      },
                    ),
                    SliverPadding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          if (!configured)
                            const EmptyState(
                              key: Key('help-not-configured'),
                              icon: CupertinoIcons.question_circle,
                              title: 'Help is not configured',
                              message:
                                  'The gym has not published a help center URL or contact details yet.',
                            ),
                          if (helpUrl != null) ...[
                            AppleGroupedSection(
                              header: 'Help center',
                              children: [
                                _NavRow(
                                  key: const Key('open-help-center'),
                                  icon: CupertinoIcons.book,
                                  label: 'Open help center',
                                  onTap: () {
                                    HapticFeedback.selectionClick();
                                    context.push(
                                      '/profile/document',
                                      extra: InAppWebArgs(
                                        title: 'Help center',
                                        url: helpUrl,
                                      ),
                                    );
                                  },
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.lg),
                          ] else if (support.hasContact)
                            Padding(
                              padding: const EdgeInsets.only(bottom: AppSpacing.lg),
                              child: Text(
                                'Help is not configured',
                                key: const Key('help-not-configured'),
                                style: AppType.headline.copyWith(
                                  color: AppColors.resolveText(context),
                                ),
                              ),
                            ),
                          if (support.hasContact) ...[
                            AppleGroupedSection(
                              header: support.gymName ?? 'Gym contact',
                              children: [
                                if (support.phone != null)
                                  _NavRow(
                                    icon: CupertinoIcons.phone,
                                    label: support.phone!,
                                    onTap: () {
                                      final uri = telUri(support.phone!);
                                      if (uri != null) opener.open(uri);
                                    },
                                  ),
                                if (support.email != null)
                                  _NavRow(
                                    icon: CupertinoIcons.mail,
                                    label: support.email!,
                                    onTap: () {
                                      final uri = mailUri(support.email!);
                                      if (uri != null) opener.open(uri);
                                    },
                                  ),
                                if (support.whatsApp != null)
                                  _NavRow(
                                    icon: CupertinoIcons.chat_bubble_2,
                                    label: support.whatsApp!,
                                    onTap: () {
                                      final uri = whatsAppUri(support.whatsApp!);
                                      if (uri != null) opener.open(uri);
                                    },
                                  ),
                                if (support.address != null)
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: AppSpacing.lg,
                                      vertical: AppSpacing.md,
                                    ),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Icon(
                                          CupertinoIcons.location,
                                          size: 18,
                                          color: AppColors.accent,
                                        ),
                                        const SizedBox(width: AppSpacing.md),
                                        Expanded(
                                          child: Text(
                                            support.address!,
                                            style: AppType.body.copyWith(
                                              color: AppColors.resolveText(context),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.lg),
                          ],
                          if (articlesFailed)
                            ErrorStateView(
                              message: 'Help articles could not be loaded. Check your connection and try again.',
                              onRetry: () => ref.invalidate(helpArticlesProvider),
                            )
                          else if (articles.isNotEmpty)
                            AppleGroupedSection(
                              header: 'Guides',
                              children: [
                                for (final article in articles)
                                  _NavRow(
                                    icon: CupertinoIcons.doc_text,
                                    label: article.title,
                                    onTap: () {
                                      HapticFeedback.selectionClick();
                                      context.push('/profile/help/article/${article.id}');
                                    },
                                  ),
                              ],
                            ),
                        ]),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class HelpArticleScreen extends ConsumerStatefulWidget {
  const HelpArticleScreen({super.key, required this.articleId});

  final String articleId;

  @override
  ConsumerState<HelpArticleScreen> createState() => _HelpArticleScreenState();
}

class _HelpArticleScreenState extends ConsumerState<HelpArticleScreen> {
  late Future<HelpArticleDetail?> _future;

  @override
  void initState() {
    super.initState();
    _future = SupportService.instance.getArticle(widget.articleId);
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Article'),
        leading: CupertinoNavigationBarBackButton(
          onPressed: () => context.pop(),
        ),
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: FutureBuilder<HelpArticleDetail?>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done) {
                  return const Center(child: CupertinoActivityIndicator());
                }
                if (snap.hasError) {
                  return ErrorStateView(
                    message: 'This article could not be loaded. Check your connection and try again.',
                    onRetry: () => setState(() {
                      _future = SupportService.instance.getArticle(widget.articleId);
                    }),
                  );
                }
                final article = snap.data;
                if (article == null) {
                  return const EmptyState(
                    title: 'Article not found',
                    message: 'This guide is not available.',
                  );
                }
                return ListView(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  children: [
                    Text(
                      article.title,
                      style: AppType.title3.copyWith(color: AppColors.resolveText(context)),
                    ),
                    if (article.summary != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        article.summary!,
                        style: AppType.subhead.copyWith(
                          color: AppColors.resolveTextSecondary(context),
                        ),
                      ),
                    ],
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      article.bodyMarkdown,
                      style: AppType.body.copyWith(color: AppColors.resolveText(context)),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressScale(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
        child: Row(
          children: [
            Icon(icon, size: 18, color: AppColors.accent),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                label,
                style: AppType.body.copyWith(color: AppColors.resolveText(context)),
              ),
            ),
            Icon(
              CupertinoIcons.chevron_right,
              size: 14,
              color: AppColors.resolveTextSecondary(context),
            ),
          ],
        ),
      ),
    );
  }
}
