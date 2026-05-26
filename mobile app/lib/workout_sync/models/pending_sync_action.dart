import 'dart:convert';

import 'workout_sync_enums.dart';

/// Durable offline mutation waiting for upload.
class PendingSyncAction {
  const PendingSyncAction({
    required this.id,
    required this.type,
    required this.payload,
    required this.createdAt,
    this.retryCount = 0,
    this.syncStatus = PendingSyncStatus.pending,
    this.lastError,
    this.memberId,
    this.sessionId,
  });

  final String id;
  final PendingSyncActionType type;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final int retryCount;
  final PendingSyncStatus syncStatus;
  final String? lastError;
  final int? memberId;
  final int? sessionId;

  PendingSyncAction copyWith({
    int? retryCount,
    PendingSyncStatus? syncStatus,
    String? lastError,
  }) =>
      PendingSyncAction(
        id: id,
        type: type,
        payload: payload,
        createdAt: createdAt,
        retryCount: retryCount ?? this.retryCount,
        syncStatus: syncStatus ?? this.syncStatus,
        lastError: lastError,
        memberId: memberId,
        sessionId: sessionId,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'payload': payload,
        'createdAt': createdAt.toIso8601String(),
        'retryCount': retryCount,
        'syncStatus': syncStatus.name,
        if (lastError != null) 'lastError': lastError,
        if (memberId != null) 'memberId': memberId,
        if (sessionId != null) 'sessionId': sessionId,
      };

  factory PendingSyncAction.fromJson(Map<String, dynamic> json) {
    return PendingSyncAction(
      id: json['id'] as String,
      type: PendingSyncActionType.values.byName(json['type'] as String),
      payload: Map<String, dynamic>.from(json['payload'] as Map),
      createdAt: DateTime.parse(json['createdAt'] as String),
      retryCount: json['retryCount'] as int? ?? 0,
      syncStatus: PendingSyncStatus.values.byName(
        json['syncStatus'] as String? ?? PendingSyncStatus.pending.name,
      ),
      lastError: json['lastError'] as String?,
      memberId: json['memberId'] as int?,
      sessionId: json['sessionId'] as int?,
    );
  }

  static String encodeList(List<PendingSyncAction> items) =>
      jsonEncode(items.map((e) => e.toJson()).toList());

  static List<PendingSyncAction> decodeList(String raw) {
    final decoded = jsonDecode(raw);
    if (decoded is! List) return [];
    return decoded
        .whereType<Map>()
        .map((e) => PendingSyncAction.fromJson(e.cast<String, dynamic>()))
        .toList();
  }
}
