import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../models/auth_models.dart';
import '../services/auth_service.dart';

enum AuthBootstrapStatus { unknown, signedIn, signedOut }

class AuthBootstrapState {
  final AuthBootstrapStatus status;
  final LoginResponse? session;
  const AuthBootstrapState(this.status, [this.session]);
}

class AuthController extends StateNotifier<AuthBootstrapState> {
  AuthController() : super(const AuthBootstrapState(AuthBootstrapStatus.unknown));

  Future<void> bootstrap() async {
    final cached = await AuthService.instance.readCachedSession();
    if (cached == null || cached.token.isEmpty) {
      state = const AuthBootstrapState(AuthBootstrapStatus.signedOut);
      return;
    }
    final refreshed = await AuthService.instance.tryRefresh();
    state = AuthBootstrapState(
      AuthBootstrapStatus.signedIn,
      refreshed ?? cached,
    );
  }

  Future<LoginResponse> login(String identifier, String password) async {
    final session = await AuthService.instance.login(identifier, password);
    state = AuthBootstrapState(AuthBootstrapStatus.signedIn, session);
    return session;
  }

  Future<void> logout() async {
    await AuthService.instance.logout();
    state = const AuthBootstrapState(AuthBootstrapStatus.signedOut);
  }

  void markSignedOut() {
    state = const AuthBootstrapState(AuthBootstrapStatus.signedOut);
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthBootstrapState>((ref) {
  final controller = AuthController();
  ApiClient.instance.onUnauthorized = controller.markSignedOut;
  return controller;
});
