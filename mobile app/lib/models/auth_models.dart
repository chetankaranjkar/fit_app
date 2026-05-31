/// Login response payload from `/api/Auth/login`.
import 'device_security_models.dart';

class LoginResponse {
  final String token;
  final String? refreshToken;
  final DateTime? refreshTokenExpiresAt;
  final String email;
  final String username;
  final String fullName;
  final int? userId;
  final int? trainerId;
  final List<String> appRoles;
  final String? sessionId;
  final int? deviceId;
  final SecurityAlertInfo? securityAlert;

  const LoginResponse({
    required this.token,
    required this.email,
    required this.username,
    required this.fullName,
    this.refreshToken,
    this.refreshTokenExpiresAt,
    this.userId,
    this.trainerId,
    this.appRoles = const [],
    this.sessionId,
    this.deviceId,
    this.securityAlert,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    final rolesRaw = json['roles'] ?? json['Roles'];
    final roles = <String>[];
    if (rolesRaw is List) {
      for (final r in rolesRaw) {
        if (r is Map) {
          final name = r['name'] ?? r['Name'];
          if (name is String && name.trim().isNotEmpty) roles.add(name.trim());
        } else if (r is String && r.trim().isNotEmpty) {
          roles.add(r.trim());
        }
      }
    }

    DateTime? expires;
    final expiresRaw = json['refreshTokenExpiresAt'] ?? json['RefreshTokenExpiresAt'];
    if (expiresRaw is String) expires = DateTime.tryParse(expiresRaw);

    return LoginResponse(
      token: (json['token'] ?? json['Token'] ?? '').toString(),
      refreshToken: (json['refreshToken'] ?? json['RefreshToken'])?.toString(),
      refreshTokenExpiresAt: expires,
      email: (json['email'] ?? json['Email'] ?? '').toString(),
      username: (json['username'] ?? json['Username'] ?? '').toString(),
      fullName: (json['fullName'] ?? json['FullName'] ?? '').toString(),
      userId: (json['userId'] ?? json['UserId']) as int?,
      trainerId: (json['trainerId'] ?? json['TrainerId']) as int?,
      appRoles: roles,
      sessionId: (json['sessionId'] ?? json['SessionId'])?.toString(),
      deviceId: (json['deviceId'] ?? json['DeviceId']) as int?,
      securityAlert: _parseAlert(json['securityAlert'] ?? json['SecurityAlert']),
    );
  }

  static SecurityAlertInfo? _parseAlert(dynamic raw) {
    if (raw is Map<String, dynamic>) return SecurityAlertInfo.fromJson(raw);
    if (raw is Map) return SecurityAlertInfo.fromJson(Map<String, dynamic>.from(raw));
    return null;
  }

  Map<String, dynamic> toJson() => {
        'token': token,
        'refreshToken': refreshToken,
        'refreshTokenExpiresAt': refreshTokenExpiresAt?.toIso8601String(),
        'email': email,
        'username': username,
        'fullName': fullName,
        'userId': userId,
        'trainerId': trainerId,
        'roles': appRoles,
        'sessionId': sessionId,
        'deviceId': deviceId,
      };
}
