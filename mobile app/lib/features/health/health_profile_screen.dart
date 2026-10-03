import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/member_access.dart';
import '../../models/health_profile_models.dart';
import '../../providers/health_providers.dart';
import '../../services/health_profile_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import '../../widgets/skeleton_shimmer.dart';

class HealthProfileScreen extends ConsumerWidget {
  const HealthProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(healthProfileProvider);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Health profile'),
        leading: CupertinoNavigationBarBackButton(onPressed: () => context.pop()),
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: async.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(AppSpacing.lg),
                child: SkeletonBlock(height: 220),
              ),
              error: (e, _) {
                if (MemberAccessCopy.isForbidden(e)) {
                  return const EmptyState(
                    title: MemberAccessCopy.accessDeniedTitle,
                    message: MemberAccessCopy.accessDeniedBody,
                    icon: CupertinoIcons.lock,
                  );
                }
                return ErrorStateView(
                  message: MemberAccessCopy.message(e, fallback: 'Could not load your health profile.'),
                  onRetry: () => ref.invalidate(healthProfileProvider),
                );
              },
              data: (profile) => _HealthProfileEditor(initial: profile),
            ),
          ),
        ],
      ),
    );
  }
}

class _HealthProfileEditor extends ConsumerStatefulWidget {
  const _HealthProfileEditor({required this.initial});
  final HealthProfile initial;

  @override
  ConsumerState<_HealthProfileEditor> createState() => _HealthProfileEditorState();
}

class _HealthProfileEditorState extends ConsumerState<_HealthProfileEditor> {
  late HealthProfileDraft _draft;
  late final TextEditingController _overview;
  late final TextEditingController _sleep;
  late final TextEditingController _doctorName;
  late final TextEditingController _doctorClinic;
  late final TextEditingController _doctorPhone;
  late final TextEditingController _otherCondition;
  late final List<TextEditingController> _medName;
  late final List<TextEditingController> _medDose;
  late final List<TextEditingController> _medReason;
  late final List<TextEditingController> _injuryNotes;
  late final TextEditingController _contactName;
  late final TextEditingController _contactRel;
  late final TextEditingController _contactMobile;
  int _step = 0;
  bool _saving = false;
  bool _saved = false;

  static const _last = 8;

  @override
  void initState() {
    super.initState();
    _draft = widget.initial.toDraft();
    _overview = TextEditingController(text: _draft.healthOverview);
    _sleep = TextEditingController(text: _draft.sleepHours?.toString() ?? '');
    _doctorName = TextEditingController(text: _draft.doctorName);
    _doctorClinic = TextEditingController(text: _draft.doctorClinic);
    _doctorPhone = TextEditingController(text: _draft.doctorContactNumber);
    final others = _draft.medicalConditions.where((c) => c.conditionCode == 'Other');
    _otherCondition = TextEditingController(
      text: others.isEmpty ? '' : (others.first.customConditionName ?? ''),
    );
    _medName = _draft.medications.map((m) => TextEditingController(text: m.medicationName)).toList();
    _medDose = _draft.medications.map((m) => TextEditingController(text: m.dosage ?? '')).toList();
    _medReason = _draft.medications.map((m) => TextEditingController(text: m.reason ?? '')).toList();
    _injuryNotes = _draft.injuries.map((i) => TextEditingController(text: i.notes ?? '')).toList();
    final contact = _draft.emergencyContacts.first;
    _contactName = TextEditingController(text: contact.name);
    _contactRel = TextEditingController(text: contact.relationship ?? '');
    _contactMobile = TextEditingController(text: contact.mobile);
  }

  @override
  void dispose() {
    _overview.dispose();
    _sleep.dispose();
    _doctorName.dispose();
    _doctorClinic.dispose();
    _doctorPhone.dispose();
    _otherCondition.dispose();
    for (final c in [..._medName, ..._medDose, ..._medReason, ..._injuryNotes]) {
      c.dispose();
    }
    _contactName.dispose();
    _contactRel.dispose();
    _contactMobile.dispose();
    super.dispose();
  }

  void _syncDraftFromFields() {
    _draft.healthOverview = _overview.text;
    _draft.sleepHours = double.tryParse(_sleep.text.trim());
    _draft.doctorName = _doctorName.text;
    _draft.doctorClinic = _doctorClinic.text;
    _draft.doctorContactNumber = _doctorPhone.text;
    _draft.medicalConditions = _draft.medicalConditions
        .map((c) => c.conditionCode == 'Other' ? c.copyWith(customConditionName: _otherCondition.text) : c)
        .toList();
    _draft.medications = [
      for (var i = 0; i < _medName.length; i++)
        MedicationItem(
          medicationName: _medName[i].text,
          dosage: _medDose[i].text,
          reason: _medReason[i].text,
        ),
    ];
    _draft.injuries = [
      for (var i = 0; i < _draft.injuries.length; i++)
        _draft.injuries[i].copyWith(notes: i < _injuryNotes.length ? _injuryNotes[i].text : null),
    ];
    _draft.emergencyContacts = [
      EmergencyContactItem(
        name: _contactName.text,
        relationship: _contactRel.text,
        mobile: _contactMobile.text,
      ),
    ];
  }

  Future<void> _save() async {
    if (_saving) return;
    _syncDraftFromFields();
    setState(() => _saving = true);
    try {
      final saved = await HealthProfileService.instance.upsertMine(_draft.toPayload());
      if (!mounted) return;
      ref.invalidate(healthProfileProvider);
      setState(() {
        _saving = false;
        _saved = true;
        _draft = saved.toDraft();
      });
      HapticFeedback.lightImpact();
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      await showCupertinoDialog<void>(
        context: context,
        builder: (ctx) => CupertinoAlertDialog(
          title: const Text('Could not save'),
          content: Text(MemberAccessCopy.message(e)),
          actions: [
            CupertinoDialogAction(onPressed: () => Navigator.of(ctx).pop(), child: const Text('OK')),
          ],
        ),
      );
    }
  }

  void _toggleCondition(String code) {
    setState(() {
      final exists = _draft.medicalConditions.any((c) => c.conditionCode == code);
      if (exists) {
        _draft.medicalConditions = _draft.medicalConditions.where((c) => c.conditionCode != code).toList();
        if (code == 'Other') _otherCondition.clear();
      } else {
        _draft.medicalConditions = [
          ..._draft.medicalConditions,
          MedicalConditionItem(conditionCode: code),
        ];
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.xxl),
            children: [
              Text(
                'Your own health assessment. This page never loads another member’s profile.',
                style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context)),
              ),
              const SizedBox(height: AppSpacing.md),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (var i = 0; i < HealthProfileConstants.steps.length; i++) ...[
                      if (i > 0) const SizedBox(width: 8),
                      _StepChip(
                        index: i,
                        label: HealthProfileConstants.steps[i],
                        active: i == _step,
                        done: i < _step,
                        onTap: () => setState(() => _step = i),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              if (_saved)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.md),
                  child: GlassCard(
                    tint: AppColors.success.withValues(alpha: 0.12),
                    child: Text(
                      'Health profile saved. You can keep editing.',
                      style: AppType.subhead.copyWith(color: AppColors.resolveText(context)),
                    ),
                  ),
                ),
              GlassCard(child: _stepBody()),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.md),
          child: Row(
            children: [
              CupertinoButton(
                onPressed: _step == 0 ? null : () => setState(() => _step -= 1),
                child: const Text('Back'),
              ),
              const Spacer(),
              if (_step < _last)
                CupertinoButton.filled(
                  onPressed: () => setState(() => _step += 1),
                  child: const Text('Continue'),
                )
              else
                CupertinoButton.filled(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Saving…' : 'Save health profile'),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _stepBody() {
    switch (_step) {
      case 0:
        return _section(
          'Health Overview',
          'A snapshot that helps coaches personalize training safely.',
          CupertinoTextField(
            controller: _overview,
            placeholder: 'Goals, past surgeries, anything your coach should know…',
            maxLines: 5,
            minLines: 4,
            padding: const EdgeInsets.all(12),
          ),
        );
      case 1:
        final selected = _draft.medicalConditions.map((c) => c.conditionCode).toSet();
        return _section(
          'Medical Conditions',
          'Tap all that apply.',
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final opt in HealthProfileConstants.conditionOptions)
                    _ChoiceChip(
                      label: opt.label,
                      selected: selected.contains(opt.code),
                      onTap: () => _toggleCondition(opt.code),
                    ),
                ],
              ),
              if (selected.contains('Other')) ...[
                const SizedBox(height: AppSpacing.md),
                CupertinoTextField(
                  controller: _otherCondition,
                  placeholder: 'Describe other condition',
                  padding: const EdgeInsets.all(12),
                ),
              ],
            ],
          ),
        );
      case 2:
        return _section(
          'Current Medications',
          'Add each medication you take regularly.',
          Column(
            children: [
              for (var i = 0; i < _medName.length; i++) ...[
                GlassCard(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    children: [
                      CupertinoTextField(controller: _medName[i], placeholder: 'Medication name', padding: const EdgeInsets.all(10)),
                      const SizedBox(height: 8),
                      CupertinoTextField(controller: _medDose[i], placeholder: 'Dosage', padding: const EdgeInsets.all(10)),
                      const SizedBox(height: 8),
                      CupertinoTextField(controller: _medReason[i], placeholder: 'Reason', padding: const EdgeInsets.all(10)),
                      CupertinoButton(
                        padding: EdgeInsets.zero,
                        onPressed: () => setState(() {
                          _medName.removeAt(i).dispose();
                          _medDose.removeAt(i).dispose();
                          _medReason.removeAt(i).dispose();
                        }),
                        child: const Text('Remove'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
              ],
              CupertinoButton(
                onPressed: () => setState(() {
                  _medName.add(TextEditingController());
                  _medDose.add(TextEditingController());
                  _medReason.add(TextEditingController());
                }),
                child: const Text('+ Add medication'),
              ),
            ],
          ),
        );
      case 3:
        return _section(
          'Injuries & Limitations',
          'Track past and current injuries for smarter programming.',
          Column(
            children: [
              for (var i = 0; i < _draft.injuries.length; i++) ...[
                GlassCard(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _pickerRow('Body part', _draft.injuries[i].bodyPart, HealthProfileConstants.bodyParts, (v) {
                        setState(() => _draft.injuries[i] = _draft.injuries[i].copyWith(bodyPart: v));
                      }),
                      const SizedBox(height: 8),
                      _pickerRow('Injury type', _draft.injuries[i].injuryType, HealthProfileConstants.injuryTypes, (v) {
                        setState(() => _draft.injuries[i] = _draft.injuries[i].copyWith(injuryType: v));
                      }),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: [
                          for (final status in HealthProfileConstants.injuryStatuses)
                            _ChoiceChip(
                              label: status,
                              selected: _draft.injuries[i].status == status,
                              onTap: () => setState(
                                () => _draft.injuries[i] = _draft.injuries[i].copyWith(status: status),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (i < _injuryNotes.length)
                        CupertinoTextField(
                          controller: _injuryNotes[i],
                          placeholder: 'Notes (optional)',
                          maxLines: 2,
                          padding: const EdgeInsets.all(10),
                        ),
                      CupertinoButton(
                        padding: EdgeInsets.zero,
                        onPressed: () => setState(() {
                          _draft.injuries.removeAt(i);
                          if (i < _injuryNotes.length) _injuryNotes.removeAt(i).dispose();
                        }),
                        child: const Text('Remove injury'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
              ],
              CupertinoButton(
                onPressed: () => setState(() {
                  _draft.injuries.add(const InjuryItem(bodyPart: '', injuryType: ''));
                  _injuryNotes.add(TextEditingController());
                }),
                child: const Text('+ Add injury'),
              ),
            ],
          ),
        );
      case 4:
        return _section(
          'Exercise Readiness (PAR-Q)',
          'Answer honestly for your safety.',
          Column(
            children: [
              _parq('Chest pain during exercise?', _draft.parqChestPainDuringExercise, (v) {
                setState(() => _draft.parqChestPainDuringExercise = v);
              }),
              _parq('Doctor advised against exercise?', _draft.parqDoctorAdvisedAgainstExercise, (v) {
                setState(() => _draft.parqDoctorAdvisedAgainstExercise = v);
              }),
              _parq('Shortness of breath?', _draft.parqShortnessOfBreath, (v) {
                setState(() => _draft.parqShortnessOfBreath = v);
              }),
              _parq('Dizziness or fainting?', _draft.parqDizzinessOrFainting, (v) {
                setState(() => _draft.parqDizzinessOrFainting = v);
              }),
              _parq('Recent surgery (last 6 months)?', _draft.parqRecentSurgery, (v) {
                setState(() => _draft.parqRecentSurgery = v);
              }),
            ],
          ),
        );
      case 5:
        return _section(
          'Lifestyle Assessment',
          'Recovery habits shape how hard you can train.',
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Smoking', style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context))),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                children: [
                  for (final opt in HealthProfileConstants.smokingOptions)
                    _ChoiceChip(
                      label: opt,
                      selected: _draft.smokingStatus == opt,
                      onTap: () => setState(() => _draft.smokingStatus = opt),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Text('Alcohol', style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context))),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                children: [
                  for (final opt in HealthProfileConstants.alcoholOptions)
                    _ChoiceChip(
                      label: opt,
                      selected: _draft.alcoholFrequency == opt,
                      onTap: () => setState(() => _draft.alcoholFrequency = opt),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Text('Stress level', style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context))),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                children: [
                  for (final opt in HealthProfileConstants.stressOptions)
                    _ChoiceChip(
                      label: opt,
                      selected: _draft.stressLevel == opt,
                      onTap: () => setState(() => _draft.stressLevel = opt),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              CupertinoTextField(
                controller: _sleep,
                placeholder: 'Average sleep (hours)',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                padding: const EdgeInsets.all(12),
              ),
            ],
          ),
        );
      case 6:
        return _section(
          'Emergency Contact',
          'Who should we call in an emergency at the gym?',
          Column(
            children: [
              CupertinoTextField(controller: _contactName, placeholder: 'Name', padding: const EdgeInsets.all(12)),
              const SizedBox(height: 8),
              CupertinoTextField(controller: _contactRel, placeholder: 'Relationship', padding: const EdgeInsets.all(12)),
              const SizedBox(height: 8),
              CupertinoTextField(
                controller: _contactMobile,
                placeholder: 'Mobile',
                keyboardType: TextInputType.phone,
                padding: const EdgeInsets.all(12),
              ),
            ],
          ),
        );
      case 7:
        return _section(
          'Doctor Information',
          'Optional — for members under medical supervision.',
          Column(
            children: [
              CupertinoTextField(controller: _doctorName, placeholder: 'Doctor name', padding: const EdgeInsets.all(12)),
              const SizedBox(height: 8),
              CupertinoTextField(controller: _doctorClinic, placeholder: 'Clinic / hospital', padding: const EdgeInsets.all(12)),
              const SizedBox(height: 8),
              CupertinoTextField(
                controller: _doctorPhone,
                placeholder: 'Contact number',
                keyboardType: TextInputType.phone,
                padding: const EdgeInsets.all(12),
              ),
            ],
          ),
        );
      default:
        final preview = HealthProfileDraft(
          healthOverview: _overview.text,
          parqChestPainDuringExercise: _draft.parqChestPainDuringExercise,
          parqDoctorAdvisedAgainstExercise: _draft.parqDoctorAdvisedAgainstExercise,
          parqShortnessOfBreath: _draft.parqShortnessOfBreath,
          parqDizzinessOrFainting: _draft.parqDizzinessOrFainting,
          parqRecentSurgery: _draft.parqRecentSurgery,
          smokingStatus: _draft.smokingStatus,
          alcoholFrequency: _draft.alcoholFrequency,
          stressLevel: _draft.stressLevel,
          sleepHours: double.tryParse(_sleep.text.trim()) ?? _draft.sleepHours,
          medicalConditions: _draft.medicalConditions,
          medications: [
            for (final c in _medName) MedicationItem(medicationName: c.text),
          ],
          injuries: _draft.injuries,
        );
        final risk = preview.previewRisk();
        final parqFlags = [
          _draft.parqChestPainDuringExercise,
          _draft.parqDoctorAdvisedAgainstExercise,
          _draft.parqShortnessOfBreath,
          _draft.parqDizzinessOrFainting,
          _draft.parqRecentSurgery,
        ].where((v) => v == true).length;
        return _section(
          'Risk Assessment',
          'Review your profile before submitting. Final risk is calculated on the server.',
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Preview risk: $risk', style: AppType.title3.copyWith(color: AppColors.resolveText(context))),
              const SizedBox(height: AppSpacing.md),
              Text('Conditions: ${_draft.medicalConditions.isEmpty ? 'None reported' : _draft.medicalConditions.length}'),
              Text(
                'Active injuries: ${_draft.injuries.where((i) => i.status != 'Resolved').length}',
              ),
              Text('Medications: ${_medName.where((c) => c.text.trim().isNotEmpty).length}'),
              Text('PAR-Q flags: $parqFlags'),
            ],
          ),
        );
    }
  }

  Widget _section(String title, String subtitle, Widget child) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: AppType.title3.copyWith(color: AppColors.resolveText(context))),
        const SizedBox(height: 4),
        Text(subtitle, style: AppType.footnote.copyWith(color: AppColors.resolveTextSecondary(context))),
        const SizedBox(height: AppSpacing.md),
        child,
      ],
    );
  }

  Widget _parq(String label, bool? value, ValueChanged<bool> onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppType.body.copyWith(color: AppColors.resolveText(context))),
          const SizedBox(height: 6),
          Row(
            children: [
              _ChoiceChip(label: 'No', selected: value == false, onTap: () => onChanged(false)),
              const SizedBox(width: 8),
              _ChoiceChip(label: 'Yes', selected: value == true, onTap: () => onChanged(true)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _pickerRow(String label, String value, List<String> options, ValueChanged<String> onPick) {
    return CupertinoButton(
      padding: EdgeInsets.zero,
      onPressed: () async {
        await showCupertinoModalPopup<void>(
          context: context,
          builder: (ctx) => CupertinoActionSheet(
            title: Text(label),
            actions: [
              for (final opt in options)
                CupertinoActionSheetAction(
                  onPressed: () {
                    onPick(opt);
                    Navigator.of(ctx).pop();
                  },
                  child: Text(opt),
                ),
            ],
            cancelButton: CupertinoActionSheetAction(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
          ),
        );
      },
      child: Row(
        children: [
          Expanded(
            child: Text(
              value.isEmpty ? label : '$label: $value',
              style: AppType.body.copyWith(color: AppColors.resolveText(context)),
            ),
          ),
          const Icon(CupertinoIcons.chevron_down, size: 14),
        ],
      ),
    );
  }
}

class _StepChip extends StatelessWidget {
  const _StepChip({
    required this.index,
    required this.label,
    required this.active,
    required this.done,
    required this.onTap,
  });

  final int index;
  final String label;
  final bool active;
  final bool done;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: active
              ? AppColors.accent.withValues(alpha: 0.16)
              : AppColors.resolveSurface(context).withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(AppRadius.pill),
          border: Border.all(
            color: active ? AppColors.accent : AppColors.resolveBorder(context),
          ),
        ),
        child: Text(
          '${(index + 1).toString().padLeft(2, '0')} $label',
          style: AppType.caption.copyWith(
            color: done && !active ? AppColors.success : AppColors.resolveText(context),
          ),
        ),
      ),
    );
  }
}

class _ChoiceChip extends StatelessWidget {
  const _ChoiceChip({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.accent.withValues(alpha: 0.18) : AppColors.resolveSurface(context),
          borderRadius: BorderRadius.circular(AppRadius.pill),
          border: Border.all(color: selected ? AppColors.accent : AppColors.resolveBorder(context)),
        ),
        child: Text(
          label,
          style: AppType.footnote.copyWith(
            color: selected ? AppColors.accent : AppColors.resolveText(context),
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
