import 'package:flutter/cupertino.dart';
import '../../theme/app_a11y.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import 'shell_layout_metrics.dart';

/// One persistent, readable navigation bar for all five member destinations.
class PremiumBottomNav extends StatelessWidget {
  const PremiumBottomNav(
      {super.key,
      required this.currentIndex,
      required this.onTap,
      required this.isDark});
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool isDark;
  static const _items = <({IconData icon, IconData activeIcon, String label})>[
    (
      icon: CupertinoIcons.house,
      activeIcon: CupertinoIcons.house_fill,
      label: 'Home'
    ),
    (
      icon: CupertinoIcons.flame,
      activeIcon: CupertinoIcons.flame_fill,
      label: 'Workouts'
    ),
    (
      icon: CupertinoIcons.book,
      activeIcon: CupertinoIcons.book_fill,
      label: 'Diet'
    ),
    (
      icon: CupertinoIcons.chart_bar,
      activeIcon: CupertinoIcons.chart_bar_fill,
      label: 'Progress'
    ),
    (
      icon: CupertinoIcons.person,
      activeIcon: CupertinoIcons.person_fill,
      label: 'Profile'
    ),
  ];
  @override
  Widget build(BuildContext context) => Container(
        height: ShellLayoutMetrics.navHeight(context),
        decoration: BoxDecoration(
          color: AppColors.resolveSurface(context),
          borderRadius:
              BorderRadius.circular(ShellLayoutMetrics.navCornerRadius),
          border:
              Border.all(color: AppColors.resolveBorder(context), width: 0.7),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
        child: Row(
            children: List.generate(_items.length, (index) {
          final item = _items[index];
          final selected = currentIndex == index;
          final color = selected
              ? AppColors.accent
              : AppColors.resolveTextSecondary(context);
          return Expanded(
              child: Semantics(
            selected: selected,
            button: true,
            label: item.label,
            child: CupertinoButton(
              key: ValueKey('nav_$index'),
              padding: const EdgeInsets.symmetric(horizontal: 2),
              onPressed: () => onTap(index),
              child: ExcludeSemantics(
                  child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(selected ? item.activeIcon : item.icon,
                      size: 22, color: color),
                  const SizedBox(height: 5),
                  Text(item.label,
                      textAlign: TextAlign.center,
                      maxLines: AppA11y.isLargeText(context) ? 2 : 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppA11y.applyTextStyle(
                          context,
                          AppType.caption.copyWith(
                              color: color,
                              fontWeight: selected
                                  ? FontWeight.w700
                                  : FontWeight.w500))),
                ],
              )),
            ),
          ));
        })),
      );
}
