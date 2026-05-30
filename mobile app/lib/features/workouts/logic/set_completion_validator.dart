/// Validation for workout set completion inputs.
class SetCompletionValidation {
  const SetCompletionValidation._();

  static String? validateReps(String? raw) {
    final text = raw?.trim() ?? '';
    if (text.isEmpty) return 'Enter actual reps';
    final value = int.tryParse(text);
    if (value == null) return 'Reps must be a whole number';
    if (value <= 0) return 'Reps must be greater than 0';
    return null;
  }

  static String? validateWeight(String? raw) {
    final text = raw?.trim() ?? '';
    if (text.isEmpty) return 'Enter actual weight';
    final value = double.tryParse(text);
    if (value == null) return 'Weight must be a number';
    if (value < 0) return 'Weight cannot be negative';
    return null;
  }

  static SetCompletionInput? parse(String repsRaw, String weightRaw) {
    final repsError = validateReps(repsRaw);
    final weightError = validateWeight(weightRaw);
    if (repsError != null || weightError != null) return null;
    return SetCompletionInput(
      actualReps: int.parse(repsRaw.trim()),
      actualWeight: double.parse(weightRaw.trim()),
    );
  }

  static String? firstError(String repsRaw, String weightRaw) {
    return validateReps(repsRaw) ?? validateWeight(weightRaw);
  }
}

class SetCompletionInput {
  const SetCompletionInput({
    required this.actualReps,
    required this.actualWeight,
  });

  final int actualReps;
  final double actualWeight;
}
