import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Tracks which workout set row is currently persisting to the API / offline queue.
final savingWorkoutSetIdProvider = StateProvider<int?>((ref) => null);

/// Optional validation message surfaced globally during set completion attempts.
final workoutSetValidationMessageProvider = StateProvider<String?>((ref) => null);
