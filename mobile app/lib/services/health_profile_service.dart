import '../core/api_client.dart';
import '../core/api_exception.dart';
import '../models/health_profile_models.dart';

/// Own health profile only. There is no method that accepts another member's id.
class HealthProfileService {
  HealthProfileService._();
  static final HealthProfileService instance = HealthProfileService._();

  static const mePath = HealthProfileEndpoints.me;

  /// `GET /HealthProfile/me`. HTTP 404 → empty own form (web member page).
  Future<HealthProfile> getMine() async {
    try {
      final res = await ApiClient.instance.get<Map<String, dynamic>>(mePath);
      return HealthProfile.fromJson(res.data ?? {});
    } on ApiException catch (e) {
      if (e.isNotFound) return HealthProfile.empty();
      rethrow;
    }
  }

  /// `PUT /HealthProfile/me`. Body has no target user id.
  Future<HealthProfile> upsertMine(Map<String, dynamic> payload) async {
    final res = await ApiClient.instance.put<Map<String, dynamic>>(mePath, body: payload);
    return HealthProfile.fromJson(res.data ?? {});
  }
}
