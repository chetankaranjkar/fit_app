export type HealthRiskLevel = 'Low' | 'Moderate' | 'High'

export interface MedicalCondition {
  id?: number
  conditionCode: string
  customConditionName?: string | null
  notes?: string | null
  label?: string
}

export interface Medication {
  id?: number
  medicationName: string
  dosage?: string | null
  reason?: string | null
}

export interface Injury {
  id?: number
  bodyPart: string
  injuryType: string
  status: string
  notes?: string | null
}

export interface EmergencyContact {
  id?: number
  name: string
  relationship?: string | null
  mobile: string
}

export interface HealthProfile {
  id?: number
  userId: number
  healthOverview?: string | null
  parqChestPainDuringExercise?: boolean | null
  parqDoctorAdvisedAgainstExercise?: boolean | null
  parqShortnessOfBreath?: boolean | null
  parqDizzinessOrFainting?: boolean | null
  parqRecentSurgery?: boolean | null
  smokingStatus?: string | null
  alcoholFrequency?: string | null
  stressLevel?: string | null
  sleepHours?: number | null
  doctorName?: string | null
  doctorClinic?: string | null
  doctorContactNumber?: string | null
  riskLevel: HealthRiskLevel
  exerciseRestrictions: string[]
  isCompleted: boolean
  lastAssessedAt?: string | null
  medicalConditions: MedicalCondition[]
  medications: Medication[]
  injuries: Injury[]
  emergencyContacts: EmergencyContact[]
}

export interface HealthProfileSummary {
  userId: number
  memberName?: string | null
  riskLevel: HealthRiskLevel
  isCompleted: boolean
  lastAssessedAt?: string | null
  medicalConditionLabels: string[]
  activeInjuries: Injury[]
  exerciseRestrictions: string[]
  requiresMedicalClearance: boolean
}

export interface UpsertHealthProfilePayload {
  healthOverview?: string | null
  parqChestPainDuringExercise?: boolean | null
  parqDoctorAdvisedAgainstExercise?: boolean | null
  parqShortnessOfBreath?: boolean | null
  parqDizzinessOrFainting?: boolean | null
  parqRecentSurgery?: boolean | null
  smokingStatus?: string | null
  alcoholFrequency?: string | null
  stressLevel?: string | null
  sleepHours?: number | null
  doctorName?: string | null
  doctorClinic?: string | null
  doctorContactNumber?: string | null
  markCompleted?: boolean
  medicalConditions: MedicalCondition[]
  medications: Medication[]
  injuries: Injury[]
  emergencyContacts: EmergencyContact[]
}

export const MEDICAL_CONDITION_OPTIONS = [
  { code: 'Diabetes', label: 'Diabetes' },
  { code: 'HighBloodPressure', label: 'High Blood Pressure' },
  { code: 'Asthma', label: 'Asthma' },
  { code: 'HeartDisease', label: 'Heart Disease' },
  { code: 'Arthritis', label: 'Arthritis' },
  { code: 'Thyroid', label: 'Thyroid' },
  { code: 'Epilepsy', label: 'Epilepsy' },
  { code: 'HighCholesterol', label: 'High Cholesterol' },
  { code: 'Obesity', label: 'Obesity' },
  { code: 'BackPain', label: 'Back Pain' },
  { code: 'KneePain', label: 'Knee Pain' },
  { code: 'Other', label: 'Other' },
] as const

export const BODY_PARTS = ['Shoulder', 'Elbow', 'Wrist', 'Back', 'Hip', 'Knee', 'Ankle', 'Neck', 'Other'] as const
export const INJURY_TYPES = ['Strain', 'Sprain', 'Fracture', 'Tendinitis', 'Surgery recovery', 'Chronic pain', 'Other'] as const
export const INJURY_STATUSES = ['Active', 'Recovering', 'Resolved'] as const
export const SMOKING_OPTIONS = ['Never', 'Occasionally', 'Daily', 'Former'] as const
export const ALCOHOL_OPTIONS = ['None', 'Occasionally', 'Weekly', 'Daily'] as const
export const STRESS_OPTIONS = ['Low', 'Moderate', 'High'] as const

export const HEALTH_STEPS = [
  'Health Overview',
  'Medical Conditions',
  'Medications',
  'Injuries',
  'Exercise Readiness',
  'Lifestyle',
  'Emergency Contact',
  'Doctor Info',
  'Risk Assessment',
] as const

export function emptyHealthProfile(userId: number): HealthProfile {
  return {
    userId,
    riskLevel: 'Low',
    exerciseRestrictions: [],
    isCompleted: false,
    medicalConditions: [],
    medications: [],
    injuries: [],
    emergencyContacts: [{ name: '', relationship: '', mobile: '' }],
  }
}

/** Maps API profile to stepper form state (shared by load and post-save sync). */
export function healthProfileToForm(profile: HealthProfile): UpsertHealthProfilePayload {
  return {
    healthOverview: profile.healthOverview ?? '',
    parqChestPainDuringExercise: profile.parqChestPainDuringExercise,
    parqDoctorAdvisedAgainstExercise: profile.parqDoctorAdvisedAgainstExercise,
    parqShortnessOfBreath: profile.parqShortnessOfBreath,
    parqDizzinessOrFainting: profile.parqDizzinessOrFainting,
    parqRecentSurgery: profile.parqRecentSurgery,
    smokingStatus: profile.smokingStatus ?? 'Never',
    alcoholFrequency: profile.alcoholFrequency ?? 'None',
    stressLevel: profile.stressLevel ?? 'Moderate',
    sleepHours: profile.sleepHours ?? 7,
    doctorName: profile.doctorName ?? '',
    doctorClinic: profile.doctorClinic ?? '',
    doctorContactNumber: profile.doctorContactNumber ?? '',
    markCompleted: true,
    medicalConditions: profile.medicalConditions.map(({ conditionCode, customConditionName, notes }) => ({
      conditionCode,
      customConditionName,
      notes,
    })),
    medications: profile.medications.length
      ? profile.medications.map(({ medicationName, dosage, reason }) => ({ medicationName, dosage, reason }))
      : [],
    injuries: profile.injuries.length
      ? profile.injuries.map(({ bodyPart, injuryType, status, notes }) => ({ bodyPart, injuryType, status, notes }))
      : [],
    emergencyContacts: profile.emergencyContacts.length
      ? profile.emergencyContacts.map(({ name, relationship, mobile }) => ({ name, relationship, mobile }))
      : [{ name: '', relationship: '', mobile: '' }],
  }
}

export function computePreviewRisk(form: UpsertHealthProfilePayload): HealthRiskLevel {
  const parqYes = [
    form.parqChestPainDuringExercise,
    form.parqDoctorAdvisedAgainstExercise,
    form.parqShortnessOfBreath,
    form.parqDizzinessOrFainting,
    form.parqRecentSurgery,
  ].some(Boolean)

  const highRiskConditions = new Set(['HeartDisease', 'Epilepsy'])
  const conditions = form.medicalConditions ?? []
  const activeInjuries = (form.injuries ?? []).filter(
    (i) => i.status === 'Active' || i.status === 'Recovering',
  )

  if (
    parqYes ||
    conditions.some((c) => highRiskConditions.has(c.conditionCode)) ||
    conditions.length >= 3 ||
    activeInjuries.some((i) => i.status === 'Active')
  ) {
    return 'High'
  }

  if (
    conditions.length >= 1 ||
    activeInjuries.length > 0 ||
    form.stressLevel === 'High' ||
    form.smokingStatus === 'Daily' ||
    (form.sleepHours != null && form.sleepHours < 6)
  ) {
    return 'Moderate'
  }

  return 'Low'
}
