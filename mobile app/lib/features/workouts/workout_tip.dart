/// General or plan-authored workout guidance. Never labeled as Neural / AI analysis.
class WorkoutTip {
  const WorkoutTip({
    required this.title,
    required this.body,
    required this.fromAssignedPlan,
  });

  final String title;
  final String body;
  final bool fromAssignedPlan;

  static const heading = 'WORKOUT TIP';
  static const generalBody =
      'Warm up, follow your assigned plan, and log sets in the live session.';
  static const fromPlanCaption = 'From your assigned plan';
  static const generalCaption = 'General tip';

  factory WorkoutTip.resolve(String? assignedPlanDescription) {
    final text = assignedPlanDescription?.trim();
    if (text != null && text.isNotEmpty) {
      return WorkoutTip(
        title: heading,
        body: text,
        fromAssignedPlan: true,
      );
    }
    return const WorkoutTip(
      title: heading,
      body: generalBody,
      fromAssignedPlan: false,
    );
  }

  String get caption => fromAssignedPlan ? fromPlanCaption : generalCaption;

  bool get claimsPersonalizedAi => false;
}
