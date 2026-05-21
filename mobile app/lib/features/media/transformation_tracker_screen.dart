import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../animations/app_motion.dart';
import '../../core/api_exception.dart';
import '../../core/formatters.dart';
import '../../core/media_urls.dart';
import '../../models/me_models.dart';
import '../../providers/me_providers.dart';
import '../../services/me_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import 'premium_media_flow.dart';

/// Transformation timeline, privacy copy, before/after compare, add progress sets.
class TransformationTrackerScreen extends ConsumerStatefulWidget {
  const TransformationTrackerScreen({super.key});

  @override
  ConsumerState<TransformationTrackerScreen> createState() => _TransformationTrackerScreenState();
}

class _TransformationTrackerScreenState extends ConsumerState<TransformationTrackerScreen> {
  MeProgressPhoto? _before;
  MeProgressPhoto? _after;
  var _compare = 0.5;

  @override
  Widget build(BuildContext context) {
    final photos = ref.watch(progressPhotosProvider);
    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Transformation'),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () => context.pop(),
          child: const Icon(CupertinoIcons.xmark),
        ),
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
              slivers: [
                CupertinoSliverRefreshControl(
                  onRefresh: () async {
                    await MeService.instance.flushPendingWorkoutSessions();
                    ref.invalidate(progressPhotosProvider);
                  },
                ),
                SliverPadding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      GlassCard(
                        tint: AppColors.accent.withValues(alpha: 0.06),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(CupertinoIcons.lock_shield_fill, color: AppColors.accent, size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Private transformation photos',
                                    style: AppType.headline.copyWith(color: AppColors.resolveText(context)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Progress photos are private and only visible to you and authorized trainers.',
                              style: AppType.subhead.copyWith(color: AppColors.resolveTextSecondary(context), height: 1.35),
                            ),
                          ],
                        ),
                      ).animate().fadeIn(duration: AppFx.regular),
                      const SizedBox(height: AppSpacing.lg),
                      CupertinoButton.filled(
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        onPressed: () => _onAddPhoto(context),
                        child: const Text('Add progress photo'),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      Text('Before / After', style: AppType.title3.copyWith(color: AppColors.resolveText(context))),
                      const SizedBox(height: 8),
                      Text(
                        'Pick two photos from your timeline, then drag the slider.',
                        style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      photos.when(
                        loading: () => const Center(child: CupertinoActivityIndicator()),
                        error: (e, _) => Text(e.toString()),
                        data: (list) {
                          if (list.isEmpty) {
                            return Text(
                              'No photos yet. Add your first set above.',
                              style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
                            );
                          }
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _compareChips(context, list),
                              const SizedBox(height: AppSpacing.md),
                              SizedBox(
                                height: 280,
                                child: _before != null && _after != null
                                    ? _CompareSlider(
                                        beforeUrl: MediaUrls.resolve(_before!.imageUrl),
                                        afterUrl: MediaUrls.resolve(_after!.imageUrl),
                                        t: _compare,
                                        onChanged: (v) => setState(() => _compare = v),
                                      )
                                    : Center(
                                        child: Text(
                                          'Select before & after below the timeline.',
                                          style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
                                          textAlign: TextAlign.center,
                                        ),
                                      ),
                              ),
                              const SizedBox(height: AppSpacing.xl),
                              Text('Timeline', style: AppType.title3.copyWith(color: AppColors.resolveText(context))),
                              const SizedBox(height: AppSpacing.sm),
                              ..._groupedTiles(context, list),
                            ],
                          );
                        },
                      ),
                      const SizedBox(height: AppSpacing.xxl),
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

  Widget _compareChips(BuildContext context, List<MeProgressPhoto> list) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _chip(
          context,
          label: 'Before: ${_before?.imageType ?? '—'}',
          onTap: () => _pickCompare(context, list, isBefore: true),
        ),
        _chip(
          context,
          label: 'After: ${_after?.imageType ?? '—'}',
          onTap: () => _pickCompare(context, list, isBefore: false),
        ),
      ],
    );
  }

  Widget _chip(BuildContext context, {required String label, required VoidCallback onTap}) {
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      color: AppColors.resolveSurfaceAlt(context),
      borderRadius: BorderRadius.circular(AppRadius.md),
      onPressed: onTap,
      child: Text(label, style: AppType.caption.copyWith(color: AppColors.resolveText(context))),
    );
  }

  Future<void> _pickCompare(BuildContext context, List<MeProgressPhoto> list, {required bool isBefore}) async {
    await showCupertinoModalPopup<void>(
      context: context,
      builder: (ctx) => Container(
        height: 360,
        padding: const EdgeInsets.only(top: 12),
        decoration: BoxDecoration(
          color: AppColors.resolveSurface(ctx),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        ),
        child: ListView.builder(
          itemCount: list.length,
          itemBuilder: (_, i) {
            final p = list[i];
            return CupertinoButton(
              alignment: Alignment.centerLeft,
              onPressed: () {
                setState(() {
                  if (isBefore) {
                    _before = p;
                  } else {
                    _after = p;
                  }
                });
                Navigator.pop(ctx);
              },
              child: Text(
                '${Fmt.date(p.imageDate)} · ${p.imageType}',
                style: AppType.body.copyWith(color: AppColors.resolveText(ctx)),
              ),
            );
          },
        ),
      ),
    );
  }

  List<Widget> _groupedTiles(BuildContext context, List<MeProgressPhoto> list) {
    final map = <String, List<MeProgressPhoto>>{};
    for (final p in list) {
      final key = '${p.imageDate.year}-${p.imageDate.month.toString().padLeft(2, '0')}';
      map.putIfAbsent(key, () => []).add(p);
    }
    final keys = map.keys.toList()..sort((a, b) => b.compareTo(a));
    final widgets = <Widget>[];
    for (final k in keys) {
      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(k, style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context))),
        ),
      );
      for (final p in map[k]!) {
        widgets.add(_photoTile(context, p));
      }
    }
    return widgets;
  }

  Widget _photoTile(BuildContext context, MeProgressPhoto p) {
    final url = MediaUrls.resolve(p.imageUrl);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: GlassCard(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.md),
              child: SizedBox(
                width: 72,
                height: 96,
                child: url.isEmpty
                    ? Container(color: AppColors.resolveSurfaceAlt(context))
                    : CachedNetworkImage(imageUrl: url, fit: BoxFit.cover),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.imageType,
                    style: AppType.headline.copyWith(color: AppColors.resolveText(context)),
                  ),
                  Text(
                    Fmt.date(p.imageDate),
                    style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
                  ),
                  if (p.weightKg != null)
                    Text(
                      '${p.weightKg} kg',
                      style: AppType.footnote.copyWith(color: AppColors.resolveText(context)),
                    ),
                  if (p.bodyFatPercent != null)
                    Text(
                      '${p.bodyFatPercent}% body fat',
                      style: AppType.footnote.copyWith(color: AppColors.resolveText(context)),
                    ),
                  if (p.notes != null && p.notes!.isNotEmpty)
                    Text(p.notes!, style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context))),
                ],
              ),
            ),
            CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () => _confirmDelete(context, p.id),
              child: const Icon(CupertinoIcons.trash, color: AppColors.danger, size: 20),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, int id) async {
    final ok = await showCupertinoDialog<bool>(
      context: context,
      builder: (c) => CupertinoAlertDialog(
        title: const Text('Delete photo?'),
        content: const Text('This cannot be undone.'),
        actions: [
          CupertinoDialogAction(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
          CupertinoDialogAction(isDestructiveAction: true, onPressed: () => Navigator.pop(c, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await MeService.instance.deleteProgressPhoto(id);
      ref.invalidate(progressPhotosProvider);
    } on ApiException catch (e) {
      if (!context.mounted) return;
      showCupertinoDialog<void>(
        context: context,
        builder: (c) => CupertinoAlertDialog(
          title: const Text('Delete failed'),
          content: Text(e.message),
          actions: [CupertinoDialogAction(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
        ),
      );
    }
  }

  Future<void> _onAddPhoto(BuildContext context) async {
    var kind = 'Front';
    final notesCtrl = TextEditingController();
    final weightCtrl = TextEditingController();
    final bfCtrl = TextEditingController();
    final confirmed = await showCupertinoDialog<bool>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            return CupertinoAlertDialog(
              title: const Text('Photo details'),
              content: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 8),
                    CupertinoSlidingSegmentedControl<String>(
                      groupValue: kind,
                      children: const {
                        'Front': Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('Front')),
                        'Side': Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('Side')),
                        'Back': Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('Back')),
                      },
                      onValueChanged: (v) {
                        if (v != null) setLocal(() => kind = v);
                      },
                    ),
                    const SizedBox(height: 10),
                    CupertinoTextField(controller: notesCtrl, placeholder: 'Notes (optional)'),
                    const SizedBox(height: 8),
                    CupertinoTextField(controller: weightCtrl, placeholder: 'Weight kg (optional)', keyboardType: TextInputType.number),
                    const SizedBox(height: 8),
                    CupertinoTextField(
                      controller: bfCtrl,
                      placeholder: 'Body fat % (optional)',
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ],
                ),
              ),
              actions: [
                CupertinoDialogAction(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                CupertinoDialogAction(isDefaultAction: true, onPressed: () => Navigator.pop(ctx, true), child: const Text('Next')),
              ],
            );
          },
        );
      },
    );
    if (confirmed != true || !context.mounted) return;

    HapticFeedback.selectionClick();
    final picked = await runPremiumMediaCapture(context, kind: PremiumMediaKind.progress);
    if (!context.mounted || picked == null) return;

    try {
      await MeService.instance.uploadProgressPhoto(
        picked.bytes,
        picked.fileName,
        imageType: kind,
        notes: notesCtrl.text.trim().isEmpty ? null : notesCtrl.text.trim(),
        weightKg: double.tryParse(weightCtrl.text.trim().replaceAll(',', '.')),
        bodyFatPercent: double.tryParse(bfCtrl.text.trim().replaceAll(',', '.')),
      );
      ref.invalidate(progressPhotosProvider);
      ref.invalidate(dashboardProvider);
      if (!context.mounted) return;
      showCupertinoDialog<void>(
        context: context,
        builder: (c) => CupertinoAlertDialog(
          title: const Text('Saved'),
          content: const Text('Your transformation photo has been uploaded.'),
          actions: [CupertinoDialogAction(isDefaultAction: true, onPressed: () => Navigator.pop(c), child: const Text('OK'))],
        ),
      );
    } on ApiException catch (e) {
      if (!context.mounted) return;
      showCupertinoDialog<void>(
        context: context,
        builder: (c) => CupertinoAlertDialog(
          title: const Text('Upload failed'),
          content: Text(e.message),
          actions: [CupertinoDialogAction(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
        ),
      );
    } finally {
      notesCtrl.dispose();
      weightCtrl.dispose();
      bfCtrl.dispose();
    }
  }
}

class _CompareSlider extends StatelessWidget {
  const _CompareSlider({
    required this.beforeUrl,
    required this.afterUrl,
    required this.t,
    required this.onChanged,
  });

  final String beforeUrl;
  final String afterUrl;
  final double t;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (ctx, c) {
        return Column(
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.lg),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CachedNetworkImage(imageUrl: afterUrl, fit: BoxFit.cover),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: FractionallySizedBox(
                        widthFactor: t.clamp(0.0, 1.0),
                        alignment: Alignment.centerLeft,
                        heightFactor: 1,
                        child: CachedNetworkImage(imageUrl: beforeUrl, fit: BoxFit.cover),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            CupertinoSlider(value: t, onChanged: onChanged),
          ],
        );
      },
    );
  }
}
