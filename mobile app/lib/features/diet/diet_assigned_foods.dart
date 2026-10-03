import '../../models/me_models.dart';

/// Whether the member app can record meals. There is no meal-log / diary API.
class DietConsumption {
  DietConsumption._();

  static const bool mealLoggingSupported = false;

  /// Planned-only payloads must never be shown as eaten totals.
  static bool get showConsumedTotals => mealLoggingSupported;
}

class AssignedFoodMatch {
  const AssignedFoodMatch({
    required this.foodName,
    required this.mealName,
    required this.quantity,
    this.calories,
    this.proteinGrams,
    this.carbsGrams,
    this.fatsGrams,
  });

  final String foodName;
  final String mealName;
  final String quantity;
  final int? calories;
  final double? proteinGrams;
  final double? carbsGrams;
  final double? fatsGrams;
}

/// Search foods on the assigned diet plan (GET /api/me/diet-plan). Not a public food DB.
List<AssignedFoodMatch> searchAssignedFoods(MeDietPlan plan, String query) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return const [];

  final out = <AssignedFoodMatch>[];
  for (final meal in plan.meals) {
    for (final item in meal.items) {
      final name = item.foodName.toLowerCase();
      final mealName = meal.mealName.toLowerCase();
      if (name.contains(q) || mealName.contains(q)) {
        out.add(
          AssignedFoodMatch(
            foodName: item.foodName,
            mealName: meal.mealName,
            quantity: item.quantity,
            calories: item.calories,
            proteinGrams: item.proteinGrams,
            carbsGrams: item.carbsGrams,
            fatsGrams: item.fatsGrams,
          ),
        );
      }
    }
  }
  return out;
}

class DietCopy {
  DietCopy._();

  static const assignedDiet = 'Assigned diet';
  static const plannedDailyTarget = 'Planned daily target';
  static const assignedMeals = 'Assigned meals';
  static const notLoggedIntake = 'These are assigned targets, not logged intake.';
  static const noMealsLoggedToday = 'No meals logged today';
  static const noMealLogApi =
      'This app does not record what you ate. Ask your gym if you need a food diary.';
  static const noDietPlanTitle = 'No diet plan assigned';
  static const noDietPlanMessage =
      'Your coach has not assigned a nutrition plan yet. Assigned meals will appear here; this screen does not record what you ate.';
  static const noMealsOnPlan = 'No meals have been added to this assigned plan yet.';
  static const previewUnavailable = 'Preview — not available';
  static const barcodeUnavailable =
      'Barcode lookup is not available in the member app.';
  static const planNotes = 'Plan notes';
  static const coachNotes = 'Coach notes';
  static const assignedMacros = 'Assigned macros';
  static const recordedWeighIns = 'Recorded weigh-ins';
  static const noRecordedWeighIns = 'No recorded weigh-ins yet.';
  static const searchAssignedFoods = 'Search assigned foods';
  static const noAssignedMatch = 'No match in your assigned plan.';
  static const water = 'Water';
  static const waterToday = 'Today';
  static const waterGoal = 'Goal';
}
