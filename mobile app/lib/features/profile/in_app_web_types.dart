import 'package:flutter/widgets.dart';

typedef InAppWebEmbedBuilder = Widget Function(
  BuildContext context, {
  required String url,
  required Object? loadError,
  required ValueChanged<Object> onError,
  required VoidCallback onRetry,
});
