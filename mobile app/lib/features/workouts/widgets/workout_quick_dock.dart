import 'package:flutter/cupertino.dart';
import 'package:glassmorphism/glassmorphism.dart';
import 'package:go_router/go_router.dart';

import '../../../theme/app_colors.dart';
import '../../shell/shell_layout_metrics.dart';

/// Futuristic quick actions dock — sits above the shell bottom nav.
class WorkoutQuickDock extends StatelessWidget {
  const WorkoutQuickDock({super.key});

  @override
  Widget build(BuildContext context) {
    final bottom = ShellLayoutMetrics.fabBottomOffset(context);
    final width = MediaQuery.sizeOf(context).width - 36;

    return Positioned(
      left: 18,
      right: 18,
      bottom: bottom,
      child: GlassmorphicContainer(
        width: width,
        height: 72,
        borderRadius: 26,
        blur: 22,
        alignment: Alignment.center,
        border: 1.2,
        linearGradient: LinearGradient(
          colors: [
            CupertinoColors.white.withValues(alpha: 0.09),
            CupertinoColors.white.withValues(alpha: 0.03),
          ],
        ),
        borderGradient: LinearGradient(
          colors: [
            AppColors.neonCyan.withValues(alpha: 0.55),
            AppColors.neonPurple.withValues(alpha: 0.35),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _DockAction(
              icon: CupertinoIcons.qrcode_viewfinder,
              label: 'Scan',
              onTap: () => context.push('/scanner'),
            ),
            _DockAction(
              icon: CupertinoIcons.chart_bar_alt_fill,
              label: 'Log',
              onTap: () => context.go('/progress'),
            ),
            _DockAction(
              icon: CupertinoIcons.chat_bubble_text_fill,
              label: 'Coach',
              onTap: () => _toast(context, 'Message your trainer from the front desk or member portal.'),
            ),
            _DockAction(
              icon: CupertinoIcons.add_circled_solid,
              label: 'Add',
              onTap: () => _toast(context, 'Your coach updates exercises — request changes in session.'),
            ),
          ],
        ),
      ),
    );
  }

  void _toast(BuildContext context, String msg) {
    showCupertinoDialog<void>(
      context: context,
      builder: (c) => CupertinoAlertDialog(
        title: const Text('PulseFit'),
        content: Text(msg),
        actions: [
          CupertinoDialogAction(onPressed: () => Navigator.pop(c), child: const Text('OK')),
        ],
      ),
    );
  }
}

class _DockAction extends StatelessWidget {
  const _DockAction({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 22, color: CupertinoColors.white.withValues(alpha: 0.92)),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.4,
              color: CupertinoColors.white.withValues(alpha: 0.65),
            ),
          ),
        ],
      ),
    );
  }
}
