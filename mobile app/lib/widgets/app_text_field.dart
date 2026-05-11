import 'package:flutter/cupertino.dart';

import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../theme/app_typography.dart';

class AppTextField extends StatefulWidget {
  const AppTextField({
    super.key,
    required this.controller,
    required this.placeholder,
    this.prefixIcon,
    this.obscure = false,
    this.keyboardType,
    this.autocorrect = true,
    this.autofillHints,
    this.textInputAction,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String placeholder;
  final IconData? prefixIcon;
  final bool obscure;
  final TextInputType? keyboardType;
  final bool autocorrect;
  final Iterable<String>? autofillHints;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  final _focus = FocusNode();
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() => _focused = _focus.hasFocus));
  }

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = CupertinoTheme.of(context).brightness == Brightness.dark;
    return AnimatedContainer(
      duration: AppMotion.fast,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDarkAlt : CupertinoColors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          width: _focused ? 1.5 : 1,
          color: _focused
              ? AppColors.accent
              : (isDark ? AppColors.borderDark : AppColors.borderLight),
        ),
      ),
      child: Row(
        children: [
          if (widget.prefixIcon != null) ...[
            Icon(widget.prefixIcon, size: 18, color: AppColors.resolveTextSecondary(context)),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: CupertinoTextField(
              controller: widget.controller,
              focusNode: _focus,
              placeholder: widget.placeholder,
              obscureText: widget.obscure,
              keyboardType: widget.keyboardType,
              autocorrect: widget.autocorrect,
              autofillHints: widget.autofillHints,
              textInputAction: widget.textInputAction,
              onSubmitted: widget.onSubmitted,
              padding: const EdgeInsets.symmetric(vertical: 14),
              style: AppType.body.copyWith(color: AppColors.resolveText(context)),
              placeholderStyle: AppType.body.copyWith(
                color: AppColors.resolveTextSecondary(context),
              ),
              decoration: const BoxDecoration(color: CupertinoColors.transparent),
            ),
          ),
        ],
      ),
    );
  }
}
