import 'api_exception.dart';

/// Copy for member-owned resources. Never interpolates another person's name.
class MemberAccessCopy {
  MemberAccessCopy._();

  static const accessDeniedTitle = 'Access denied';
  static const accessDeniedBody =
      'You can only open records on your own account. This screen does not load another member.';

  static const genericLoadFailed = 'Could not load this screen. Try again.';

  static bool isForbidden(Object error) =>
      error is ApiException && error.isForbidden;

  static String message(Object error, {String fallback = genericLoadFailed}) {
    if (isForbidden(error)) return accessDeniedBody;
    if (error is ApiException) {
      final text = error.message.trim();
      if (text.isNotEmpty) return text;
    }
    final raw = error.toString().trim();
    return raw.isEmpty ? fallback : raw;
  }
}
