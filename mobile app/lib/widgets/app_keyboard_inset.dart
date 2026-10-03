import 'package:flutter/widgets.dart';

/// Pads for the on-screen keyboard. Use under scaffolds that host text fields.
class AppKeyboardInset extends StatelessWidget {
  const AppKeyboardInset({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: child,
    );
  }
}
