import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api_exception.dart';
import '../../providers/me_providers.dart';
import '../../services/me_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/app_typography.dart';
import '../../widgets/app_button.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/premium_background.dart';
import '../../widgets/section_header.dart';
import 'phone_health_provider.dart';
import 'phone_health_snapshot.dart';

class PhoneHealthScreen extends ConsumerStatefulWidget {
  const PhoneHealthScreen({super.key});

  @override
  ConsumerState<PhoneHealthScreen> createState() => _PhoneHealthScreenState();
}

enum _HealthPhase { checking, unavailable, consent, loading, ready, failed }

class _PhoneHealthScreenState extends ConsumerState<PhoneHealthScreen> {
  _HealthPhase _phase = _HealthPhase.checking;
  PhoneHealthSnapshot? _snapshot;
  String? _message;
  bool _savingWeight = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    final source = ref.read(phoneHealthSourceProvider);
    try {
      final available = await source.isAvailable();
      if (!mounted) return;
      if (!available) {
        setState(() => _phase = _HealthPhase.unavailable);
        return;
      }
      final granted = await source.hasReadAccess();
      if (!mounted) return;
      if (!granted) {
        setState(() => _phase = _HealthPhase.consent);
        return;
      }
      await _load();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _phase = _HealthPhase.failed;
        _message = error.toString();
      });
    }
  }

  Future<void> _connect() async {
    setState(() {
      _phase = _HealthPhase.loading;
      _message = null;
    });
    final source = ref.read(phoneHealthSourceProvider);
    try {
      final granted = await source.requestReadAccess();
      if (!mounted) return;
      if (!granted) {
        setState(() {
          _phase = _HealthPhase.consent;
          _message =
              'Health Connect did not grant read access. Allow steps, weight, exercise, heart rate, blood oxygen, and calories, then try again.';
        });
        return;
      }
      await _load();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _phase = _HealthPhase.failed;
        _message = error.toString();
      });
    }
  }

  Future<void> _load() async {
    setState(() => _phase = _HealthPhase.loading);
    final source = ref.read(phoneHealthSourceProvider);
    try {
      final snapshot = await source.read(now: DateTime.now());
      if (!mounted) return;
      setState(() {
        _snapshot = snapshot;
        _phase = _HealthPhase.ready;
        _message = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _phase = _HealthPhase.failed;
        _message = error.toString();
      });
    }
  }

  Future<void> _saveLatestWeight() async {
    final latest = _snapshot?.latestWeight;
    if (latest == null || _savingWeight) return;
    setState(() => _savingWeight = true);
    try {
      await MeService.instance.createBodyMetric(
        weightKg: latest.kilograms,
        notes: 'From Health Connect',
        measurementDate: latest.recordedAt,
      );
      ref.invalidate(bodyMetricsProvider);
      if (!mounted) return;
      setState(() => _savingWeight = false);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _savingWeight = false;
        _message = error is ApiException ? error.message : error.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final recorded = ref.watch(bodyMetricsProvider).asData?.value ?? const [];
    final latest = _snapshot?.latestWeight;
    final alreadySaved = latest != null &&
        weightAlreadyRecorded(
          recorded: recorded.map((row) => (at: row.loggedAt, weight: row.weight)),
          at: latest.recordedAt,
          kilograms: latest.kilograms,
        );

    return CupertinoPageScaffold(
      backgroundColor: AppColors.resolveBg(context),
      navigationBar: CupertinoNavigationBar(
        middle: const Text('Google Fit'),
        leading: CupertinoNavigationBarBackButton(onPressed: () => context.pop()),
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: PremiumBackground()),
          SafeArea(
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [
                Text(
                  'Steps, weight, and workouts from Google Fit via Health Connect. Heart rate, oxygen, and calories come from a band such as Fitbit when that app is allowed to write them into Health Connect. Gym check-ins and assigned sessions stay separate.',
                  style: AppType.subhead.copyWith(color: AppColors.resolveTextSecondary(context), height: 1.35),
                ),
                const SizedBox(height: AppSpacing.lg),
                ..._body(context, alreadySaved: alreadySaved),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _body(BuildContext context, {required bool alreadySaved}) {
    switch (_phase) {
      case _HealthPhase.checking:
      case _HealthPhase.loading:
        return const [
          SizedBox(height: 48),
          Center(child: CupertinoActivityIndicator()),
        ];
      case _HealthPhase.unavailable:
        return [
          const EmptyState(
            title: 'Health Connect is not available',
            message:
                'Install Health Connect, then allow Google Fit (and Fitbit Air, if you use one) to write health data into it.',
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: 'Install Health Connect',
            onTap: () => ref.read(phoneHealthSourceProvider).promptInstall(),
          ),
        ];
      case _HealthPhase.consent:
        return [
          if (_message != null) ...[
            Text(_message!, style: AppType.caption.copyWith(color: AppColors.danger)),
            const SizedBox(height: AppSpacing.md),
          ],
          const EmptyState(
            title: 'Connect Google Fit',
            message:
                'PulseFit reads steps, weight, exercise, heart rate, oxygen, and active calories. It does not write workouts back to Google Fit.',
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(label: 'Allow health data', onTap: _connect),
        ];
      case _HealthPhase.failed:
        return [
          ErrorStateView(
            message: _message ?? 'Health data could not be read.',
            onRetry: _bootstrap,
          ),
        ];
      case _HealthPhase.ready:
        final snapshot = _snapshot;
        if (snapshot == null) {
          return [
            ErrorStateView(message: 'Health data could not be read.', onRetry: _load),
          ];
        }
        return [
          _StepsCard(steps: snapshot.steps, today: snapshot.stepsToday),
          const SizedBox(height: AppSpacing.xl),
          const SectionHeader(title: 'Heart rate'),
          const SizedBox(height: AppSpacing.md),
          if (snapshot.heartRates.isEmpty)
            const EmptyState(
              title: 'No heart rate from the band',
              message:
                  'Sync the Fitbit in its app, then in Health Connect allow Fitbit to write heart rate and allow Tiger Fitness to read it.',
            )
          else
            _HeartRateCard(readings: snapshot.heartRates),
          const SizedBox(height: AppSpacing.xl),
          const SectionHeader(title: 'Oxygen level'),
          const SizedBox(height: AppSpacing.md),
          if (snapshot.bloodOxygen.isEmpty)
            const EmptyState(
              title: 'No oxygen reading from the band',
              message:
                  'Fitbit often records SpO₂ during sleep. Sync the band, and allow oxygen saturation in Health Connect.',
            )
          else
            _BloodOxygenCard(readings: snapshot.bloodOxygen),
          const SizedBox(height: AppSpacing.xl),
          const SectionHeader(title: 'Weight'),
          const SizedBox(height: AppSpacing.md),
          _WeightCard(
            weights: snapshot.weights,
            alreadySaved: alreadySaved,
            saving: _savingWeight,
            onSave: _saveLatestWeight,
          ),
          if (_message != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(_message!, style: AppType.caption.copyWith(color: AppColors.danger)),
          ],
          const SizedBox(height: AppSpacing.xl),
          const SectionHeader(title: 'Workouts'),
          const SizedBox(height: AppSpacing.md),
          _WorkoutCard(workouts: snapshot.workouts),
        ];
    }
  }
}

class _StepsCard extends StatelessWidget {
  const _StepsCard({required this.steps, required this.today});

  final List<DailyStepCount> steps;
  final int? today;

  @override
  Widget build(BuildContext context) {
    final dayFormat = DateFormat('E');
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Steps today', style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context))),
          const SizedBox(height: 4),
          Text(
            today == null ? '—' : today.toString(),
            style: AppType.largeTitle.copyWith(color: AppColors.resolveText(context)),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              for (final day in steps)
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        day.count == null ? '—' : day.count.toString(),
                        style: AppType.caption.copyWith(color: AppColors.resolveText(context)),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        dayFormat.format(day.day),
                        style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeartRateCard extends StatelessWidget {
  const _HeartRateCard({required this.readings});

  final List<PhoneHeartRateReading> readings;

  @override
  Widget build(BuildContext context) {
    final latest = readings.first;
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Latest', style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context))),
          const SizedBox(height: 4),
          Text(
            '${latest.bpm} bpm',
            style: AppType.largeTitle.copyWith(color: AppColors.resolveText(context)),
          ),
          const SizedBox(height: 4),
          Text(
            DateFormat('MMM d, h:mm a').format(latest.recordedAt.toLocal()),
            style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
          ),
          const SizedBox(height: AppSpacing.md),
          for (final row in readings.take(6))
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      DateFormat('MMM d, h:mm a').format(row.recordedAt.toLocal()),
                      style: AppType.subhead.copyWith(color: AppColors.resolveText(context)),
                    ),
                  ),
                  Text(
                    '${row.bpm} bpm',
                    style: AppType.subhead.copyWith(color: AppColors.resolveTextSecondary(context)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _BloodOxygenCard extends StatelessWidget {
  const _BloodOxygenCard({required this.readings});

  final List<PhoneBloodOxygenReading> readings;

  @override
  Widget build(BuildContext context) {
    final latest = readings.first;
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Latest SpO₂', style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context))),
          const SizedBox(height: 4),
          Text(
            '${latest.percent.round()}%',
            style: AppType.largeTitle.copyWith(color: AppColors.resolveText(context)),
          ),
          const SizedBox(height: 4),
          Text(
            DateFormat('MMM d, h:mm a').format(latest.recordedAt.toLocal()),
            style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
          ),
          const SizedBox(height: AppSpacing.md),
          for (final row in readings.take(6))
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      DateFormat('MMM d, h:mm a').format(row.recordedAt.toLocal()),
                      style: AppType.subhead.copyWith(color: AppColors.resolveText(context)),
                    ),
                  ),
                  Text(
                    '${row.percent.round()}%',
                    style: AppType.subhead.copyWith(color: AppColors.resolveTextSecondary(context)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _WeightCard extends StatelessWidget {
  const _WeightCard({
    required this.weights,
    required this.alreadySaved,
    required this.saving,
    required this.onSave,
  });

  final List<PhoneWeightReading> weights;
  final bool alreadySaved;
  final bool saving;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    if (weights.isEmpty) {
      return const EmptyState(
        title: 'No weight in Health Connect',
        message: 'Weigh-ins from Google Fit appear here after Health Connect has a weight record from the last 30 days.',
      );
    }
    final latest = weights.first;
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${latest.kilograms.toStringAsFixed(1)} kg',
            style: AppType.title2.copyWith(color: AppColors.resolveText(context)),
          ),
          const SizedBox(height: 4),
          Text(
            'Latest ${DateFormat('MMM d, h:mm a').format(latest.recordedAt.toLocal())}',
            style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
          ),
          const SizedBox(height: AppSpacing.md),
          for (final row in weights.take(6))
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      DateFormat('MMM d').format(row.recordedAt.toLocal()),
                      style: AppType.subhead.copyWith(color: AppColors.resolveText(context)),
                    ),
                  ),
                  Text(
                    '${row.kilograms.toStringAsFixed(1)} kg',
                    style: AppType.subhead.copyWith(color: AppColors.resolveTextSecondary(context)),
                  ),
                ],
              ),
            ),
          const SizedBox(height: AppSpacing.sm),
          if (alreadySaved)
            Text(
              'This weigh-in is already in recorded progress.',
              style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
            )
          else
            AppButton(
              label: 'Save latest to weigh-ins',
              isLoading: saving,
              onTap: saving ? null : onSave,
            ),
        ],
      ),
    );
  }
}

class _WorkoutCard extends StatelessWidget {
  const _WorkoutCard({required this.workouts});

  final List<PhoneWorkoutReading> workouts;

  @override
  Widget build(BuildContext context) {
    if (workouts.isEmpty) {
      return const EmptyState(
        title: 'No workouts in Health Connect',
        message: 'Exercise sessions from Google Fit from the last 30 days show here. Assigned gym sessions stay on the Progress tab.',
      );
    }
    return Column(
      children: [
        for (final workout in workouts)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: GlassCard(
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(workout.activity, style: AppType.headline.copyWith(color: AppColors.resolveText(context))),
                        const SizedBox(height: 4),
                        Text(
                          '${DateFormat('MMM d, h:mm a').format(workout.start.toLocal())} · ${formatWorkoutDuration(workout.duration)}',
                          style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
                        ),
                      ],
                    ),
                  ),
                  if (workout.energyKcal != null)
                    Text(
                      '${workout.energyKcal} kcal',
                      style: AppType.caption.copyWith(color: AppColors.resolveTextSecondary(context)),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
