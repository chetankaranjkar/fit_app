import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../animations/app_motion.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/press_scale.dart';

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
    return CupertinoPageScaffold(
      child: Stack(
        children: [
          Positioned.fill(child: navigationShell),
          Positioned(
            left: AppSpacing.lg,
            right: AppSpacing.lg,
            bottom: 20,
            child: _FloatingNavBar(
              isDark: isDark,
              currentIndex: navigationShell.currentIndex,
              onTap: (i) => _onTap(context, i),
            ),
          ),
        ],
      ),
    );
  }
}

class _FloatingNavBar extends StatelessWidget {
  const _FloatingNavBar({
    required this.isDark,
    required this.currentIndex,
    required this.onTap,
  });

  final bool isDark;
  final int currentIndex;
  final ValueChanged<int> onTap;

  static const _items = <({IconData icon, IconData activeIcon, String label})>[
    (icon: CupertinoIcons.house, activeIcon: CupertinoIcons.house_fill, label: 'Home'),
    (icon: CupertinoIcons.flame, activeIcon: CupertinoIcons.flame_fill, label: 'Workouts'),
    (icon: CupertinoIcons.chart_bar, activeIcon: CupertinoIcons.chart_bar_fill, label: 'Progress'),
    (icon: CupertinoIcons.creditcard, activeIcon: CupertinoIcons.creditcard_fill, label: 'Membership'),
    (icon: CupertinoIcons.person, activeIcon: CupertinoIcons.person_fill, label: 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: isDark
            ? const LinearGradient(
                colors: [Color(0xCC111127), Color(0xD90B0B1A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : const LinearGradient(
                colors: [Color(0xF2FFFFFF), Color(0xE6F8F8FC)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
        border: Border.all(
          color: isDark
              ? const Color(0x3394A3B8)
              : AppColors.borderLight.withValues(alpha: 0.7),
        ),
        boxShadow: [
          ...AppColors.luxuryShadow(context),
          if (isDark)
            BoxShadow(
              color: AppColors.neonPurple.withValues(alpha: 0.18),
              blurRadius: 30,
              spreadRadius: 1,
              offset: const Offset(0, 8),
            ),
        ],
      ),
      child: Row(
        children: List.generate(_items.length, (index) {
          final item = _items[index];
          final active = index == currentIndex;
          final tint = active
              ? AppColors.accent
              : (isDark ? AppColors.textDarkSecondary : AppColors.textLightSecondary);
          return Expanded(
            child: PressScale(
              scale: 0.95,
              onTap: () => onTap(index),
              child: AnimatedContainer(
                duration: AppMotion.fast,
                curve: Curves.easeOutCubic,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  gradient: active
                      ? LinearGradient(
                          colors: [
                            AppColors.accent.withValues(alpha: 0.24),
                            AppColors.neonPurple.withValues(alpha: 0.18),
                          ],
                        )
                      : null,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(active ? item.activeIcon : item.icon, color: tint, size: 20)
                        .animate(target: active ? 1 : 0)
                        .scaleXY(begin: 0.9, end: 1.08, duration: AppFx.quick),
                    const SizedBox(height: 2),
                    Text(
                      item.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppType.caption.copyWith(
                        color: tint,
                        fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                        fontSize: 10.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}
