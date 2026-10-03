import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../providers/me_providers.dart';
import '../../theme/app_colors.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/premium_background.dart';
import 'in_app_web_types.dart';

class InAppWebArgs {
  const InAppWebArgs({required this.title, required this.url});

  final String title;
  final String url;
}

/// In-app browser. Nav bar and system back pop this route (return to Help/Privacy, then Profile).
class InAppWebScreen extends ConsumerStatefulWidget {
  const InAppWebScreen({
    super.key,
    required this.title,
    required this.url,
  });

  final String title;
  final String url;

  @override
  ConsumerState<InAppWebScreen> createState() => _InAppWebScreenState();
}

class _InAppWebScreenState extends ConsumerState<InAppWebScreen> {
  Object? _loadError;
  int _generation = 0;

  void _popToPrevious() {
    if (context.canPop()) {
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final embed = ref.watch(inAppWebEmbedBuilderProvider);

    return PopScope(
      canPop: true,
      child: CupertinoPageScaffold(
        backgroundColor: AppColors.resolveBg(context),
        navigationBar: CupertinoNavigationBar(
          middle: Text(widget.title),
          leading: CupertinoNavigationBarBackButton(
            onPressed: _popToPrevious,
          ),
        ),
        child: Stack(
          children: [
            const Positioned.fill(child: PremiumBackground()),
            SafeArea(
              child: widget.url.trim().isEmpty
                  ? const EmptyState(
                      title: 'This page is not available',
                      message: 'No URL is configured.',
                    )
                  : embed != null
                  ? embed(
                      context,
                      url: widget.url,
                      loadError: _loadError,
                      onError: (err) => setState(() => _loadError = err),
                      onRetry: () => setState(() {
                        _loadError = null;
                        _generation++;
                      }),
                    )
                  : _DefaultWebEmbed(
                      key: ValueKey(_generation),
                      url: widget.url,
                      loadError: _loadError,
                      onError: (err) => setState(() => _loadError = err),
                      onRetry: () => setState(() {
                        _loadError = null;
                        _generation++;
                      }),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DefaultWebEmbed extends StatefulWidget {
  const _DefaultWebEmbed({
    super.key,
    required this.url,
    required this.loadError,
    required this.onError,
    required this.onRetry,
  });

  final String url;
  final Object? loadError;
  final ValueChanged<Object> onError;
  final VoidCallback onRetry;

  @override
  State<_DefaultWebEmbed> createState() => _DefaultWebEmbedState();
}

class _DefaultWebEmbedState extends State<_DefaultWebEmbed> {
  WebViewController? _controller;
  var _loading = true;

  @override
  void initState() {
    super.initState();
    _bindController();
  }

  void _bindController() {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() => _loading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (error) {
            widget.onError(error.description);
            if (mounted) setState(() => _loading = false);
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.url));
    _controller = controller;
  }

  @override
  Widget build(BuildContext context) {
    final err = widget.loadError;
    if (err != null) {
      return ErrorStateView(
        message: 'This page could not be loaded. Check your connection and try again.',
        onRetry: widget.onRetry,
      );
    }

    final controller = _controller;
    if (controller == null) {
      return const Center(child: CupertinoActivityIndicator());
    }

    return Stack(
      children: [
        WebViewWidget(controller: controller),
        if (_loading)
          const Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: CupertinoActivityIndicator(),
          ),
      ],
    );
  }
}
