import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';

import '../core/app_config.dart';

/// Device network + lightweight API reachability for sync UI.
class SyncConnectivityService {
  SyncConnectivityService._();
  static final SyncConnectivityService instance = SyncConnectivityService._();

  final _connectivity = Connectivity();

  Stream<List<ConnectivityResult>> get onConnectivityChanged =>
      _connectivity.onConnectivityChanged;

  Future<bool> hasDeviceNetwork() async {
    final results = await _connectivity.checkConnectivity();
    return !results.contains(ConnectivityResult.none);
  }

  /// `GET /health/live` on API host (not under `/api`).
  Future<bool> pingServer() async {
    try {
      final dio = Dio(BaseOptions(
        baseUrl: AppConfig.apiHost,
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
        validateStatus: (s) => s != null && s < 600,
      ));
      final res = await dio.get<dynamic>('/health/live');
      return res.statusCode != null && res.statusCode! >= 200 && res.statusCode! < 300;
    } catch (_) {
      return false;
    }
  }
}
