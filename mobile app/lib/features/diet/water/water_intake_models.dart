/// One add of water. Undo removes the last entry; history is not rewritten.
class WaterIntakeEntry {
  const WaterIntakeEntry({
    required this.id,
    required this.milliliters,
    required this.recordedAt,
  });

  final String id;
  final int milliliters;

  /// Instant the add was recorded (device local clock, serialized as ISO-8601).
  final DateTime recordedAt;

  Map<String, dynamic> toJson() => {
        'id': id,
        'ml': milliliters,
        'recordedAt': recordedAt.toIso8601String(),
      };

  factory WaterIntakeEntry.fromJson(Map<String, dynamic> json) {
    return WaterIntakeEntry(
      id: json['id']?.toString() ?? '',
      milliliters: _int(json['ml']) ?? 0,
      recordedAt: DateTime.tryParse(json['recordedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

/// Recorded intake for one member on one **local calendar day**.
/// [goalMl] is not stored here — goal is assigned/derived separately from recorded ml.
class WaterDayRecord {
  const WaterDayRecord({
    required this.memberUserId,
    required this.localDate,
    required this.entries,
  });

  /// `Users.Id` for the logged-in member (`Members.UserId`, 1:1). Not `Members.Id`.
  final int memberUserId;

  /// `yyyy-MM-dd` in the **device local** calendar (not UTC).
  final String localDate;

  final List<WaterIntakeEntry> entries;

  int get totalMl => entries.fold<int>(0, (sum, e) => sum + e.milliliters);

  bool get canUndo => entries.isNotEmpty;

  WaterDayRecord copyWith({List<WaterIntakeEntry>? entries}) {
    return WaterDayRecord(
      memberUserId: memberUserId,
      localDate: localDate,
      entries: entries ?? this.entries,
    );
  }

  factory WaterDayRecord.empty(int memberUserId, String localDate) {
    return WaterDayRecord(memberUserId: memberUserId, localDate: localDate, entries: const []);
  }

  Map<String, dynamic> toJson() => {
        'memberUserId': memberUserId,
        'localDate': localDate,
        'entries': entries.map((e) => e.toJson()).toList(),
      };

  factory WaterDayRecord.fromJson(Map<String, dynamic> json) {
    final raw = json['entries'];
    final list = <WaterIntakeEntry>[];
    if (raw is List) {
      for (final item in raw) {
        if (item is Map<String, dynamic>) {
          list.add(WaterIntakeEntry.fromJson(item));
        } else if (item is Map) {
          list.add(WaterIntakeEntry.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }
    return WaterDayRecord(
      memberUserId: _int(json['memberUserId']) ?? 0,
      localDate: json['localDate']?.toString() ?? '',
      entries: list,
    );
  }
}

int? _int(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v);
  return null;
}
