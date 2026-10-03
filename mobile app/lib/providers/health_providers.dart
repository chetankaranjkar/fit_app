import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/health_profile_models.dart';
import '../models/member_supplement_models.dart';
import '../services/health_profile_service.dart';
import '../services/member_supplements_service.dart';

final healthProfileProvider = FutureProvider.autoDispose<HealthProfile>((ref) async {
  return HealthProfileService.instance.getMine();
});

final assignedSupplementsProvider =
    FutureProvider.autoDispose<List<MemberSupplementAssignment>>((ref) async {
  return MemberSupplementsService.instance.getMine();
});
