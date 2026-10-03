/// Assigned supplement protocol matching `GET /api/MemberSupplements/me`.
class MemberSupplementEndpoints {
  MemberSupplementEndpoints._();

  static const me = '/MemberSupplements/me';
}

class MemberSupplementAssignment {
  final int id;
  final String supplementName;
  final String category;
  final String dosage;
  final String timing;
  final String timingLabel;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? notes;
  final String? assignedByName;
  final String status;
  final bool isCurrentlyActive;
  final String? productName;
  final String? instructions;
  final int? daysRemaining;
  final int? compliancePercent;

  const MemberSupplementAssignment({
    required this.id,
    required this.supplementName,
    required this.category,
    required this.dosage,
    required this.timing,
    required this.timingLabel,
    this.startDate,
    this.endDate,
    this.notes,
    this.assignedByName,
    required this.status,
    required this.isCurrentlyActive,
    this.productName,
    this.instructions,
    this.daysRemaining,
    this.compliancePercent,
  });

  factory MemberSupplementAssignment.fromJson(Map<String, dynamic> json) {
    return MemberSupplementAssignment(
      id: _asInt(json['id']) ?? 0,
      supplementName: json['supplementName']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      dosage: json['dosage']?.toString() ?? '',
      timing: json['timing']?.toString() ?? '',
      timingLabel: json['timingLabel']?.toString() ?? json['timing']?.toString() ?? '',
      startDate: _asDate(json['startDate']),
      endDate: _asDate(json['endDate']),
      notes: json['notes']?.toString(),
      assignedByName: json['assignedByName']?.toString(),
      status: json['status']?.toString() ?? '',
      isCurrentlyActive: json['isCurrentlyActive'] == true,
      productName: json['productName']?.toString(),
      instructions: json['instructions']?.toString(),
      daysRemaining: _asInt(json['daysRemaining']),
      compliancePercent: _asInt(json['compliancePercent']),
    );
  }
}

int? _asInt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v);
  return null;
}

DateTime? _asDate(dynamic v) {
  if (v == null) return null;
  if (v is DateTime) return v;
  if (v is String) return DateTime.tryParse(v);
  return null;
}
