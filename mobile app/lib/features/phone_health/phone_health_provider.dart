import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'phone_health_source.dart';

final phoneHealthSourceProvider = Provider<PhoneHealthSource>((ref) {
  return HealthConnectSource();
});
