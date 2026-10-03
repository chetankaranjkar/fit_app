import '../core/api_client.dart';
import '../models/member_supplement_models.dart';

/// Assigned protocol for the signed-in member. Read-only — no assign/update APIs.
class MemberSupplementsService {
  MemberSupplementsService._();
  static final MemberSupplementsService instance = MemberSupplementsService._();

  static const mePath = MemberSupplementEndpoints.me;

  /// `GET /MemberSupplements/me?activeOnly=true`. Token-scoped; no userId argument.
  Future<List<MemberSupplementAssignment>> getMine({bool activeOnly = true}) async {
    final res = await ApiClient.instance.get<List<dynamic>>(
      mePath,
      query: {'activeOnly': activeOnly},
    );
    return (res.data ?? const [])
        .whereType<Map>()
        .map((e) => MemberSupplementAssignment.fromJson(e.cast<String, dynamic>()))
        .toList();
  }
}
