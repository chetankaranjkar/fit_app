import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/press_scale.dart';
import 'shell_layout_metrics.dart';

/// Premium floating dock — safe-area aware, glass surface, animated selection.
class PremiumBottomNav extends StatelessWidget {
  const PremiumBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.isDark,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool isDark;

  static const _items = <({IconData icon, IconData activeIcon, String label})>[
    (icon: CupertinoIcons.house, activeIcon: CupertinoIcons.house_fill, label: 'Home'),
    (icon: CupertinoIcons.flame, activeIcon: CupertinoIcons.flame_fill, label: 'Workouts'),
    (icon: CupertinoIcons.book, activeIcon: CupertinoIcons.book_fill, label: 'Diet'),
    (icon: CupertinoIcons.chart_bar, activeIcon: CupertinoIcons.chart_bar_fill, label: 'Progress'),
    (icon: CupertinoIcons.person, activeIcon: CupertinoIcons.person_fill, label: 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: ShellLayoutMetrics.navBarHeight,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(ShellLayoutMetrics.navCornerRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(ShellLayoutMetrics.navCornerRadius),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [
                        const Color(0xD114141C),
                        const Color(0xE60B0B12),
                      ]
                    : [
                        const Color(0xF5FFFFFF),
                        const Color(0xEBF4F4F8),
                      ],
              ),
              border: Border.all(
                color: isDark
                    ? const Color(0x40FFFFFF)
                    : AppColors.borderLight.withValues(alpha: 0.65),
                width: 0.8,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF000000).withValues(alpha: isDark ? 0.55 : 0.12),
                  blurRadius: 32,
                  offset: const Offset(0, 14),
                ),
                BoxShadow(
                  color: AppColors.accent.withValues(alpha: isDark ? 0.22 : 0.14),
                  blurRadius: 28,
                  spreadRadius: -4,
                  offset: const Offset(0, 10),
                ),
                if (isDark)
                  BoxShadow(
                    color: AppColors.neonPurple.withValues(alpha: 0.12),
                    blurRadius: 36,
                    offset: const Offset(0, 8),
                  ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
              child: Row(
                children: List.generate(_items.length, (index) {
                  return Expanded(
                    child: _NavTab(
                      key: ValueKey('nav_$index'),
                      item: _items[index],
                      selected: index == currentIndex,
                      isDark: isDark,
                      onTap: () {
                        HapticFeedback.lightImpact();
                        onTap(index);
                      },
                    ),
                  );
                }),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavTab extends StatelessWidget {
  const _NavTab({
    super.key,
    required this.item,
    required this.selected,
    required this.isDark,
    required this.onTap,
  });

  final ({IconData icon, IconData activeIcon, String label}) item;
  final bool selected;
  final bool isDark;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final inactiveColor = isDark
        ? AppColors.textDarkSecondary.withValues(alpha: 0.55)
        : AppColors.textLightSecondary.withValues(alpha: 0.65);

    return PressScale(
      scale: 0.94,
      haptics: false,
      onTap: onTap,
      child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: AppMotion.easeOut,
          constraints: const BoxConstraints(minHeight: 48),
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: selected
                ? LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.accent.withValues(alpha: 0.32),
                      AppColors.accentSoft.withValues(alpha: 0.18),
                      AppColors.neonPurple.withValues(alpha: 0.14),
                    ],
                  )
                : null,
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: AppColors.accent.withValues(alpha: 0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedScale(
                scale: selected ? 1.1 : 1.0,
                duration: const Duration(milliseconds: 220),
                curve: AppMotion.easeOut,
                child: Icon(
                  selected ? item.activeIcon : item.icon,
                  size: 22,
                  color: selected ? AppColors.accent : inactiveColor,
                ),
              )
                  .animate(target: selected ? 1 : 0)
                  .fade(duration: AppMotion.fast)
                  .scaleXY(
                    begin: 0.92,
                    end: 1.06,
                    duration: const Duration(milliseconds: 220),
                  ),
              const SizedBox(height: 4),
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 220),
                curve: AppMotion.easeOut,
                style: AppType.caption.copyWith(
                  fontSize: 10.5,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: selected ? AppColors.accent : inactiveColor,
                  letterSpacing: selected ? 0.2 : 0,
                ),
                child: Text(
                  item.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
    );
  }
}
