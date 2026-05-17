import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_colors.dart';
import 'premium_bottom_nav.dart';
import 'shell_layout_metrics.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  void _onTap(BuildContext context, int index) {
    HapticFeedback.selectionClick();
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    final bottomInset = ShellLayoutMetrics.systemBottomInset(context);

    return CupertinoPageScaffold(
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(child: navigationShell),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: ShellLayoutMetrics.dockOccupiedHeight(context) + 48,
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppColors.bgDark.withValues(alpha: 0),
                      AppColors.bgDark.withValues(alpha: isDark ? 0.72 : 0.35),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: ShellLayoutMetrics.horizontalInset,
            right: ShellLayoutMetrics.horizontalInset,
            bottom: ShellLayoutMetrics.dockBottomOffset(context),
            child: PremiumBottomNav(
              isDark: isDark,
              currentIndex: navigationShell.currentIndex,
              onTap: (i) => _onTap(context, i),
            ),
          ),
          if (bottomInset > 0)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: bottomInset,
              child: const IgnorePointer(
                child: ColoredBox(color: Color(0x00000000)),
              ),
            ),
        ],
      ),
    );
  }
}
