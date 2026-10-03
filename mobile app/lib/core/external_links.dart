import 'package:url_launcher/url_launcher.dart';

/// Opens tel/mailto/https. Tests override [externalLinkOpenerProvider].
class ExternalLinkOpener {
  const ExternalLinkOpener();

  Future<bool> open(Uri uri) => launchUrl(uri, mode: LaunchMode.externalApplication);
}

Uri? whatsAppUri(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (digits.length < 10) return null;
  return Uri.parse('https://wa.me/$digits');
}

Uri? telUri(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (digits.length < 8) return null;
  return Uri(scheme: 'tel', path: digits);
}

Uri? mailUri(String email) {
  final trimmed = email.trim();
  if (!trimmed.contains('@')) return null;
  return Uri(scheme: 'mailto', path: trimmed);
}
