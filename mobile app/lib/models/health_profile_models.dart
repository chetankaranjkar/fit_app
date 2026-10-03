/// Member health assessment matching `/api/HealthProfile/me`.
/// Payloads never include a target user id — the API uses the JWT.
class HealthProfileEndpoints {
  HealthProfileEndpoints._();

  static const me = '/HealthProfile/me';
}

class HealthConditionOption {
  const HealthConditionOption(this.code, this.label);
  final String code;
  final String label;
}

class HealthProfileConstants {
  HealthProfileConstants._();

  static const conditionOptions = [
    HealthConditionOption('Diabetes', 'Diabetes'),
    HealthConditionOption('HighBloodPressure', 'High Blood Pressure'),
    HealthConditionOption('Asthma', 'Asthma'),
    HealthConditionOption('HeartDisease', 'Heart Disease'),
    HealthConditionOption('Arthritis', 'Arthritis'),
    HealthConditionOption('Thyroid', 'Thyroid'),
    HealthConditionOption('Epilepsy', 'Epilepsy'),
    HealthConditionOption('HighCholesterol', 'High Cholesterol'),
    HealthConditionOption('Obesity', 'Obesity'),
    HealthConditionOption('BackPain', 'Back Pain'),
    HealthConditionOption('KneePain', 'Knee Pain'),
    HealthConditionOption('Other', 'Other'),
  ];

  static const bodyParts = [
    'Shoulder',
    'Elbow',
    'Wrist',
    'Back',
    'Hip',
    'Knee',
    'Ankle',
    'Neck',
    'Other',
  ];

  static const injuryTypes = [
    'Strain',
    'Sprain',
    'Fracture',
    'Tendinitis',
    'Surgery recovery',
    'Chronic pain',
    'Other',
  ];

  static const injuryStatuses = ['Active', 'Recovering', 'Resolved'];
  static const smokingOptions = ['Never', 'Occasionally', 'Daily', 'Former'];
  static const alcoholOptions = ['None', 'Occasionally', 'Weekly', 'Daily'];
  static const stressOptions = ['Low', 'Moderate', 'High'];

  static const steps = [
    'Health Overview',
    'Medical Conditions',
    'Medications',
    'Injuries',
    'Exercise Readiness',
    'Lifestyle',
    'Emergency Contact',
    'Doctor Info',
    'Risk Assessment',
  ];
}

class MedicalConditionItem {
  final String conditionCode;
  final String? customConditionName;
  final String? notes;
  final String label;

  const MedicalConditionItem({
    required this.conditionCode,
    this.customConditionName,
    this.notes,
    this.label = '',
  });

  factory MedicalConditionItem.fromJson(Map<String, dynamic> json) {
    return MedicalConditionItem(
      conditionCode: json['conditionCode']?.toString() ?? '',
      customConditionName: json['customConditionName']?.toString(),
      notes: json['notes']?.toString(),
      label: json['label']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toPayload() => {
        'conditionCode': conditionCode,
        'customConditionName': customConditionName,
        'notes': notes,
      };

  MedicalConditionItem copyWith({String? customConditionName}) => MedicalConditionItem(
        conditionCode: conditionCode,
        customConditionName: customConditionName ?? this.customConditionName,
        notes: notes,
        label: label,
      );
}

class MedicationItem {
  final String medicationName;
  final String? dosage;
  final String? reason;

  const MedicationItem({
    required this.medicationName,
    this.dosage,
    this.reason,
  });

  factory MedicationItem.fromJson(Map<String, dynamic> json) {
    return MedicationItem(
      medicationName: json['medicationName']?.toString() ?? '',
      dosage: json['dosage']?.toString(),
      reason: json['reason']?.toString(),
    );
  }

  Map<String, dynamic> toPayload() => {
        'medicationName': medicationName,
        'dosage': dosage,
        'reason': reason,
      };

  MedicationItem copyWith({String? medicationName, String? dosage, String? reason}) =>
      MedicationItem(
        medicationName: medicationName ?? this.medicationName,
        dosage: dosage ?? this.dosage,
        reason: reason ?? this.reason,
      );
}

class InjuryItem {
  final String bodyPart;
  final String injuryType;
  final String status;
  final String? notes;

  const InjuryItem({
    required this.bodyPart,
    required this.injuryType,
    this.status = 'Active',
    this.notes,
  });

  factory InjuryItem.fromJson(Map<String, dynamic> json) {
    return InjuryItem(
      bodyPart: json['bodyPart']?.toString() ?? '',
      injuryType: json['injuryType']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Active',
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toPayload() => {
        'bodyPart': bodyPart,
        'injuryType': injuryType,
        'status': status,
        'notes': notes,
      };

  InjuryItem copyWith({
    String? bodyPart,
    String? injuryType,
    String? status,
    String? notes,
  }) =>
      InjuryItem(
        bodyPart: bodyPart ?? this.bodyPart,
        injuryType: injuryType ?? this.injuryType,
        status: status ?? this.status,
        notes: notes ?? this.notes,
      );
}

class EmergencyContactItem {
  final String name;
  final String? relationship;
  final String mobile;

  const EmergencyContactItem({
    required this.name,
    this.relationship,
    required this.mobile,
  });

  factory EmergencyContactItem.fromJson(Map<String, dynamic> json) {
    return EmergencyContactItem(
      name: json['name']?.toString() ?? '',
      relationship: json['relationship']?.toString(),
      mobile: json['mobile']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toPayload() => {
        'name': name,
        'relationship': relationship,
        'mobile': mobile,
      };

  EmergencyContactItem copyWith({String? name, String? relationship, String? mobile}) =>
      EmergencyContactItem(
        name: name ?? this.name,
        relationship: relationship ?? this.relationship,
        mobile: mobile ?? this.mobile,
      );
}

class HealthProfile {
  final int id;
  final String? healthOverview;
  final bool? parqChestPainDuringExercise;
  final bool? parqDoctorAdvisedAgainstExercise;
  final bool? parqShortnessOfBreath;
  final bool? parqDizzinessOrFainting;
  final bool? parqRecentSurgery;
  final String? smokingStatus;
  final String? alcoholFrequency;
  final String? stressLevel;
  final double? sleepHours;
  final String? doctorName;
  final String? doctorClinic;
  final String? doctorContactNumber;
  final String riskLevel;
  final List<String> exerciseRestrictions;
  final bool isCompleted;
  final DateTime? lastAssessedAt;
  final List<MedicalConditionItem> medicalConditions;
  final List<MedicationItem> medications;
  final List<InjuryItem> injuries;
  final List<EmergencyContactItem> emergencyContacts;

  const HealthProfile({
    this.id = 0,
    this.healthOverview,
    this.parqChestPainDuringExercise,
    this.parqDoctorAdvisedAgainstExercise,
    this.parqShortnessOfBreath,
    this.parqDizzinessOrFainting,
    this.parqRecentSurgery,
    this.smokingStatus,
    this.alcoholFrequency,
    this.stressLevel,
    this.sleepHours,
    this.doctorName,
    this.doctorClinic,
    this.doctorContactNumber,
    this.riskLevel = 'Low',
    this.exerciseRestrictions = const [],
    this.isCompleted = false,
    this.lastAssessedAt,
    this.medicalConditions = const [],
    this.medications = const [],
    this.injuries = const [],
    this.emergencyContacts = const [],
  });

  /// Own empty assessment when `GET /HealthProfile/me` is 404 (same as web).
  factory HealthProfile.empty() => const HealthProfile(
        emergencyContacts: [EmergencyContactItem(name: '', mobile: '')],
      );

  factory HealthProfile.fromJson(Map<String, dynamic> json) {
    return HealthProfile(
      id: _asInt(json['id']) ?? 0,
      healthOverview: json['healthOverview']?.toString(),
      parqChestPainDuringExercise: json['parqChestPainDuringExercise'] as bool?,
      parqDoctorAdvisedAgainstExercise: json['parqDoctorAdvisedAgainstExercise'] as bool?,
      parqShortnessOfBreath: json['parqShortnessOfBreath'] as bool?,
      parqDizzinessOrFainting: json['parqDizzinessOrFainting'] as bool?,
      parqRecentSurgery: json['parqRecentSurgery'] as bool?,
      smokingStatus: json['smokingStatus']?.toString(),
      alcoholFrequency: json['alcoholFrequency']?.toString(),
      stressLevel: json['stressLevel']?.toString(),
      sleepHours: _asDouble(json['sleepHours']),
      doctorName: json['doctorName']?.toString(),
      doctorClinic: json['doctorClinic']?.toString(),
      doctorContactNumber: json['doctorContactNumber']?.toString(),
      riskLevel: json['riskLevel']?.toString() ?? 'Low',
      exerciseRestrictions: (json['exerciseRestrictions'] as List? ?? [])
          .map((e) => e.toString())
          .toList(),
      isCompleted: json['isCompleted'] == true,
      lastAssessedAt: _asDate(json['lastAssessedAt']),
      medicalConditions: _maps(json['medicalConditions']).map(MedicalConditionItem.fromJson).toList(),
      medications: _maps(json['medications']).map(MedicationItem.fromJson).toList(),
      injuries: _maps(json['injuries']).map(InjuryItem.fromJson).toList(),
      emergencyContacts: _maps(json['emergencyContacts']).map(EmergencyContactItem.fromJson).toList(),
    );
  }

  HealthProfileDraft toDraft() {
    final contacts = emergencyContacts.isEmpty
        ? [const EmergencyContactItem(name: '', mobile: '')]
        : emergencyContacts;
    return HealthProfileDraft(
      healthOverview: healthOverview ?? '',
      parqChestPainDuringExercise: parqChestPainDuringExercise,
      parqDoctorAdvisedAgainstExercise: parqDoctorAdvisedAgainstExercise,
      parqShortnessOfBreath: parqShortnessOfBreath,
      parqDizzinessOrFainting: parqDizzinessOrFainting,
      parqRecentSurgery: parqRecentSurgery,
      smokingStatus: smokingStatus ?? 'Never',
      alcoholFrequency: alcoholFrequency ?? 'None',
      stressLevel: stressLevel ?? 'Moderate',
      sleepHours: sleepHours ?? 7,
      doctorName: doctorName ?? '',
      doctorClinic: doctorClinic ?? '',
      doctorContactNumber: doctorContactNumber ?? '',
      medicalConditions: List.of(medicalConditions),
      medications: List.of(medications),
      injuries: List.of(injuries),
      emergencyContacts: List.of(contacts),
    );
  }
}

class HealthProfileDraft {
  String healthOverview;
  bool? parqChestPainDuringExercise;
  bool? parqDoctorAdvisedAgainstExercise;
  bool? parqShortnessOfBreath;
  bool? parqDizzinessOrFainting;
  bool? parqRecentSurgery;
  String smokingStatus;
  String alcoholFrequency;
  String stressLevel;
  double? sleepHours;
  String doctorName;
  String doctorClinic;
  String doctorContactNumber;
  List<MedicalConditionItem> medicalConditions;
  List<MedicationItem> medications;
  List<InjuryItem> injuries;
  List<EmergencyContactItem> emergencyContacts;

  HealthProfileDraft({
    this.healthOverview = '',
    this.parqChestPainDuringExercise,
    this.parqDoctorAdvisedAgainstExercise,
    this.parqShortnessOfBreath,
    this.parqDizzinessOrFainting,
    this.parqRecentSurgery,
    this.smokingStatus = 'Never',
    this.alcoholFrequency = 'None',
    this.stressLevel = 'Moderate',
    this.sleepHours = 7,
    this.doctorName = '',
    this.doctorClinic = '',
    this.doctorContactNumber = '',
    List<MedicalConditionItem>? medicalConditions,
    List<MedicationItem>? medications,
    List<InjuryItem>? injuries,
    List<EmergencyContactItem>? emergencyContacts,
  })  : medicalConditions = medicalConditions ?? [],
        medications = medications ?? [],
        injuries = injuries ?? [],
        emergencyContacts = emergencyContacts ??
            [const EmergencyContactItem(name: '', mobile: '')];

  /// PUT body for `/HealthProfile/me` — no `userId`.
  Map<String, dynamic> toPayload({bool markCompleted = true}) {
    return {
      'healthOverview': healthOverview,
      'parqChestPainDuringExercise': parqChestPainDuringExercise,
      'parqDoctorAdvisedAgainstExercise': parqDoctorAdvisedAgainstExercise,
      'parqShortnessOfBreath': parqShortnessOfBreath,
      'parqDizzinessOrFainting': parqDizzinessOrFainting,
      'parqRecentSurgery': parqRecentSurgery,
      'smokingStatus': smokingStatus,
      'alcoholFrequency': alcoholFrequency,
      'stressLevel': stressLevel,
      'sleepHours': sleepHours,
      'doctorName': doctorName,
      'doctorClinic': doctorClinic,
      'doctorContactNumber': doctorContactNumber,
      'markCompleted': markCompleted,
      'medicalConditions': medicalConditions.map((e) => e.toPayload()).toList(),
      'medications': medications
          .where((m) => m.medicationName.trim().isNotEmpty)
          .map((e) => e.toPayload())
          .toList(),
      'injuries': injuries
          .where((i) => i.bodyPart.trim().isNotEmpty)
          .map((e) => e.toPayload())
          .toList(),
      'emergencyContacts': emergencyContacts
          .where((c) => c.name.trim().isNotEmpty)
          .map((e) => e.toPayload())
          .toList(),
    };
  }

  String previewRisk() {
    final parqYes = [
      parqChestPainDuringExercise,
      parqDoctorAdvisedAgainstExercise,
      parqShortnessOfBreath,
      parqDizzinessOrFainting,
      parqRecentSurgery,
    ].any((v) => v == true);

    const highRisk = {'HeartDisease', 'Epilepsy'};
    final activeInjuries = injuries
        .where((i) => i.status == 'Active' || i.status == 'Recovering')
        .toList();

    if (parqYes ||
        medicalConditions.any((c) => highRisk.contains(c.conditionCode)) ||
        medicalConditions.length >= 3 ||
        activeInjuries.any((i) => i.status == 'Active')) {
      return 'High';
    }

    if (medicalConditions.isNotEmpty ||
        activeInjuries.isNotEmpty ||
        stressLevel == 'High' ||
        smokingStatus == 'Daily' ||
        (sleepHours != null && sleepHours! < 6)) {
      return 'Moderate';
    }
    return 'Low';
  }
}

int? _asInt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v);
  return null;
}

double? _asDouble(dynamic v) {
  if (v == null) return null;
  if (v is double) return v;
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v);
  return null;
}

DateTime? _asDate(dynamic v) {
  if (v == null) return null;
  if (v is DateTime) return v;
  if (v is String) return DateTime.tryParse(v);
  return null;
}

List<Map<String, dynamic>> _maps(dynamic raw) {
  if (raw is! List) return const [];
  return raw.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
}
