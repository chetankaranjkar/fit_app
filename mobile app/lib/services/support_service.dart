import '../core/api_client.dart';
import '../core/app_config.dart';
import '../models/support_models.dart';

/// Member support bundle (`/api/me/support`) and help-center catalog (`/api/help`).
class SupportService {
  SupportService._();
  static final SupportService instance = SupportService._();

  Future<MemberSupport> getSupport() async {
    final res = await ApiClient.instance.get<Map<String, dynamic>>('/me/support');
    return MemberSupport.fromJson(res.data ?? {});
  }

  Future<List<HelpArticleSummary>> getArticles() async {
    final res = await ApiClient.instance.get<List<dynamic>>('/help/articles');
    return (res.data ?? const [])
        .whereType<Map>()
        .map((e) => HelpArticleSummary.fromJson(Map<String, dynamic>.from(e)))
        .where((a) => a.id.isNotEmpty && a.title.isNotEmpty)
        .toList();
  }

  Future<HelpArticleDetail?> getArticle(String id) async {
    final res = await ApiClient.instance.get<Map<String, dynamic>>('/help/articles/$id');
    final data = res.data;
    if (data == null || data.isEmpty) return null;
    return HelpArticleDetail.fromJson(data);
  }

  static String? mergeHelpUrl(MemberSupport? remote, String? compileTime) {
    return AppConfig.httpOrNull(remote?.helpCenterUrl) ?? AppConfig.httpOrNull(compileTime);
  }

  static String? mergePrivacyUrl(MemberSupport? remote, String? compileTime) {
    return AppConfig.httpOrNull(remote?.privacyPolicyUrl) ?? AppConfig.httpOrNull(compileTime);
  }
}
