import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../models/workout_tracking_models.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/fitness_text.dart';
import '../../../widgets/glass_card.dart';
import '../../phone_health/phone_health_provider.dart';
import '../../phone_health/phone_health_snapshot.dart';

class WorkoutBandWindow {
  const WorkoutBandWindow({required this.start, required this.end, required this.duringSets});

  final DateTime start;
  final DateTime end;
  final bool duringSets;
}

/// Logged-set span when the session has completion times. Otherwise the local workout day.
WorkoutBandWindow bandWindowForSession(ActiveWorkoutSession session, {DateTime? now}) {
  final stamps = <DateTime>[
    for (final group in session.exercises)
      for (final set in group.sets)
        if (set.isCompleted && set.completedAt != null) set.completedAt!,
  ];
  if (stamps.isNotEmpty) {
    stamps.sort();
    return WorkoutBandWindow(
      start: stamps.first.subtract(const Duration(minutes: 10)),
      end: stamps.last.add(const Duration(minutes: 10)),
      duringSets: true,
    );
  }
  final clock = now ?? DateTime.now();
  final day = (session.workoutDate ?? session.startTimeUtc ?? clock).toLocal();
  final start = DateTime(day.year, day.month, day.day);
  final end = clock.isBefore(start) ? start.add(const Duration(days: 1)) : clock;
  return WorkoutBandWindow(start: start, end: end, duringSets: false);
}

/// Fitbit / Google Fit readings from Health Connect for this workout.
class WorkoutBandCard extends ConsumerStatefulWidget {
  const WorkoutBandCard({super.key, required this.session});

  final ActiveWorkoutSession session;

  @override
  ConsumerState<WorkoutBandCard> createState() => _WorkoutBandCardState();
}

class _WorkoutBandCardState extends ConsumerState<WorkoutBandCard> {
  var _loading = true;
  String? _blocked;
  BandSessionMeasures? _measures;
  var _duringSets = true;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    final window = bandWindowForSession(widget.session);
    final source = ref.read(phoneHealthSourceProvider);
    try {
      final available = await source.isAvailable();
      if (!available) {
        if (mounted) {
          setState(() {
            _loading = false;
            _blocked = 'Install Health Connect, then let the Fitbit app write heart rate, oxygen, and calories into it.';
          });
        }
        return;
      }
      final granted = await source.hasReadAccess();
      if (!granted) {
        if (mounted) {
          setState(() {
            _loading = false;
            _blocked = 'Allow heart rate, oxygen, and calories so this workout can show the band.';
          });
        }
        return;
      }
      final snapshot = await source.read(
        now: DateTime.now(),
        vitalsFrom: window.start,
        vitalsTo: window.end,
      );
      final measures = measuresDuring(
        start: window.start,
        end: window.end,
        heartRates: snapshot.heartRates,
        bloodOxygen: snapshot.bloodOxygen,
        calories: snapshot.calories,
      );
      if (!mounted) return;
      setState(() {
        _loading = false;
        _blocked = null;
        _measures = measures;
        _duringSets = window.duringSets;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _blocked = 'Band readings could not be read. Open Google Fit and allow Health Connect access.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final measures = _measures;
    final title = _duringSets ? 'From your band' : 'From your band today';
    return GlassCard(
      radius: 22,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title.toUpperCase(), style: FitnessText.label(context)),
          const SizedBox(height: AppSpacing.sm),
          if (_loading)
            const CupertinoActivityIndicator()
          else if (_blocked != null) ...[
            Text(_blocked!, style: FitnessText.body(context)),
            const SizedBox(height: AppSpacing.sm),
            CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () => context.push('/progress/google-fit'),
              child: Text('Open Google Fit', style: FitnessText.chip(context, color: AppColors.neonCyan)),
            ),
          ] else if (measures != null && measures.hasAny) ...[
            if (measures.averageBpm != null)
              Text(
                'Heart rate ${measures.averageBpm} avg · ${measures.maxBpm} max',
                style: FitnessText.body(context),
              ),
            if (measures.oxygenPercent != null)
              Text('Oxygen ${measures.oxygenPercent!.round()}%', style: FitnessText.body(context)),
            if (measures.activeKcal != null)
              Text('Calories ${measures.activeKcal} kcal', style: FitnessText.body(context)),
          ] else ...[
            Text(
              'No Fitbit readings in this workout yet. Sync the band in the Fitbit app, then allow heart rate, oxygen, and calories in Health Connect.',
              style: FitnessText.body(context),
            ),
            const SizedBox(height: AppSpacing.sm),
            CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () => context.push('/progress/google-fit'),
              child: Text('Open Google Fit', style: FitnessText.chip(context, color: AppColors.neonCyan)),
            ),
          ],
        ],
      ),
    );
  }
}
