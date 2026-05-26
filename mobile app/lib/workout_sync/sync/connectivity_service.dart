import 'package:connectivity_plus/connectivity_plus.dart';

import '../../services/sync_connectivity_service.dart';

/// Device network + API reachability (wraps existing ping helper).
class ConnectivityService {
  ConnectivityService._();
  static final ConnectivityService instance = ConnectivityService._();

  final _connectivity = Connectivity();
  final _ping = SyncConnectivityService.instance;

  Stream<List<ConnectivityResult>> get onConnectivityChanged =>
      _connectivity.onConnectivityChanged;

  Future<bool> hasDeviceNetwork() async {
    final results = await _connectivity.checkConnectivity();
    return !results.contains(ConnectivityResult.none);
  }

  Future<bool> isOnline() async {
    if (!await hasDeviceNetwork()) return false;
    return _ping.pingServer();
  }
}
