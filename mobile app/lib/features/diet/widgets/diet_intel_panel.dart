import 'package:flutter/cupertino.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';

class DietIntelPanelCompact extends StatefulWidget {
  const DietIntelPanelCompact({super.key});

  @override
  State<DietIntelPanelCompact> createState() => _DietIntelPanelCompactState();
}

class _DietIntelPanelCompactState extends State<DietIntelPanelCompact> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: 26,
      padding: const EdgeInsets.all(AppSpacing.md),
      tint: AppColors.neonPurple.withValues(alpha: 0.06),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('NUTRIENT SCANNER', style: FitnessText.label(context)),
          const SizedBox(height: AppSpacing.sm),
          CupertinoSearchTextField(
            controller: _controller,
            placeholder: 'Search foods, brands, macros…',
            style: FitnessText.body(context),
            onSubmitted: (_) => _showSheet(context),
            suffixIcon: const Icon(CupertinoIcons.mic_fill, color: AppColors.neonCyan, size: 18),
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _SuggestionChip(
                label: 'AI: High-protein yogurt',
                onTap: () => _toast(context, 'Curated for your protein window.'),
              ),
              _SuggestionChip(
                label: 'Scan barcode',
                onTap: () => _toast(context, 'Use the gym kiosk or member portal barcode tools.'),
              ),
              _SuggestionChip(
                label: 'Trending: Greek bowl',
                onTap: () => _toast(context, 'Macro-safe meal trending with PulseFit athletes.'),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms);
  }

  void _showSheet(BuildContext context) {
    showCupertinoModalPopup<void>(
      context: context,
      builder: (c) => CupertinoActionSheet(
        title: const Text('Smart search'),
        message: Text(_controller.text.isEmpty ? 'Type a food to analyze.' : _controller.text),
        actions: [
          CupertinoActionSheetAction(
            onPressed: () => Navigator.pop(c),
            child: const Text('Analyze macros (preview)'),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(c),
          isDefaultAction: true,
          child: const Text('Close'),
        ),
      ),
    );
  }

  void _toast(BuildContext context, String msg) {
    showCupertinoDialog<void>(
      context: context,
      builder: (c) => CupertinoAlertDialog(
        content: Text(msg),
        actions: [
          CupertinoDialogAction(onPressed: () => Navigator.pop(c), child: const Text('OK')),
        ],
      ),
    );
  }
}

class _SuggestionChip extends StatelessWidget {
  const _SuggestionChip({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      color: AppColors.surfaceDarkAlt.withValues(alpha: 0.75),
      borderRadius: BorderRadius.circular(999),
      minimumSize: Size.zero,
      onPressed: onTap,
      child: Text(
        label,
        style: FitnessText.body(context).copyWith(fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}
