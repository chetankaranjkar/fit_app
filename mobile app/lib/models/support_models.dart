/// Gym contact + legal URLs from `/api/me/support` (null = not stored).
class MemberSupport {
  const MemberSupport({
    this.gymName,
    this.email,
    this.phone,
    this.address,
    this.whatsApp,
    this.helpCenterUrl,
    this.privacyPolicyUrl,
  });

  final String? gymName;
  final String? email;
  final String? phone;
  final String? address;
  final String? whatsApp;
  final String? helpCenterUrl;
  final String? privacyPolicyUrl;

  bool get hasContact =>
      _has(email) || _has(phone) || _has(address) || _has(whatsApp);

  factory MemberSupport.fromJson(Map<String, dynamic> json) {
    return MemberSupport(
      gymName: _str(json['gymName'] ?? json['GymName']),
      email: _str(json['email'] ?? json['Email']),
      phone: _str(json['phone'] ?? json['Phone']),
      address: _str(json['address'] ?? json['Address']),
      whatsApp: _str(json['whatsApp'] ?? json['WhatsApp']),
      helpCenterUrl: _str(json['helpCenterUrl'] ?? json['HelpCenterUrl']),
      privacyPolicyUrl: _str(json['privacyPolicyUrl'] ?? json['PrivacyPolicyUrl']),
    );
  }

  static String? _str(dynamic v) {
    final s = v?.toString().trim();
    return (s == null || s.isEmpty) ? null : s;
  }

  static bool _has(String? v) => v != null && v.trim().isNotEmpty;
}

class HelpArticleSummary {
  const HelpArticleSummary({
    required this.id,
    required this.title,
    this.summary,
    this.categoryId,
  });

  final String id;
  final String title;
  final String? summary;
  final String? categoryId;

  factory HelpArticleSummary.fromJson(Map<String, dynamic> json) {
    return HelpArticleSummary(
      id: (json['id'] ?? json['Id'] ?? '').toString(),
      title: (json['title'] ?? json['Title'] ?? '').toString(),
      summary: MemberSupport._str(json['summary'] ?? json['Summary']),
      categoryId: MemberSupport._str(json['categoryId'] ?? json['CategoryId']),
    );
  }
}

class HelpArticleDetail {
  const HelpArticleDetail({
    required this.id,
    required this.title,
    required this.bodyMarkdown,
    this.summary,
  });

  final String id;
  final String title;
  final String bodyMarkdown;
  final String? summary;

  factory HelpArticleDetail.fromJson(Map<String, dynamic> json) {
    return HelpArticleDetail(
      id: (json['id'] ?? json['Id'] ?? '').toString(),
      title: (json['title'] ?? json['Title'] ?? '').toString(),
      bodyMarkdown: (json['bodyMarkdown'] ?? json['BodyMarkdown'] ?? '').toString(),
      summary: MemberSupport._str(json['summary'] ?? json['Summary']),
    );
  }
}

class ResolvedLegalLinks {
  const ResolvedLegalLinks({this.helpCenterUrl, this.privacyPolicyUrl});

  final String? helpCenterUrl;
  final String? privacyPolicyUrl;
}
