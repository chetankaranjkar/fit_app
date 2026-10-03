import 'package:flutter/cupertino.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pulsefit/features/diet/diet_assigned_foods.dart';
import 'package:pulsefit/features/diet/widgets/diet_intel_panel.dart';
import 'package:pulsefit/features/diet/widgets/diet_nutrition_hero.dart';
import 'package:pulsefit/features/workouts/widgets/workout_ai_coach_card.dart';
import 'package:pulsefit/features/workouts/workout_tip.dart';
import 'package:pulsefit/models/me_models.dart';

MeDietPlan _plan({
  String yogurt = 'Greek yogurt',
  List<MeDietMeal>? meals,
}) {
  return MeDietPlan(
    assignmentId: 1,
    dietPlanId: 9,
    planName: 'High Protein',
    goalType: 'Muscle gain',
    calories: 2200,
    proteinGrams: 180,
    carbsGrams: 200,
    fatsGrams: 60,
    startDate: DateTime.utc(2026, 10, 1),
    meals: meals ??
        [
          MeDietMeal(
            id: 1,
            mealName: 'Breakfast',
            mealOrder: 1,
            items: [
              MeDietMealItem(
                id: 11,
                foodName: yogurt,
                quantity: '200 g',
                calories: 190,
                proteinGrams: 18,
                carbsGrams: 8,
                fatsGrams: 5,
              ),
            ],
          ),
        ],
  );
}

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('Assigned food search (diet-plan payload)', () {
    test('finds foods from GET /me/diet-plan shaped JSON', () {
      final fromApi = MeDietPlan.fromJson({
        'assignmentId': 3,
        'dietPlanId': 4,
        'planName': 'Cut',
        'goalType': 'Fat loss',
        'calories': 1800,
        'proteinGrams': 150,
        'meals': [
          {
            'id': 1,
            'mealName': 'Lunch',
            'mealOrder': 2,
            'items': [
              {
                'id': 21,
                'foodName': 'Grilled chicken',
                'quantity': '150 g',
                'calories': 250,
                'proteinGrams': 40,
              },
            ],
          },
        ],
      });

      final hits = searchAssignedFoods(fromApi, 'chicken');
      expect(hits, hasLength(1));
      expect(hits.first.foodName, 'Grilled chicken');
      expect(hits.first.calories, 250);
    });

    test('empty query does not invent results', () {
      expect(searchAssignedFoods(_plan(), '   '), isEmpty);
    });
  });

  group('Assigned vs recorded', () {
    test('planned-only never exposes consumed totals', () {
      expect(DietConsumption.mealLoggingSupported, isFalse);
      expect(DietConsumption.showConsumedTotals, isFalse);
    });

    test('empty-state copy distinguishes no plan vs no logs', () {
      expect(DietCopy.noDietPlanTitle, isNot(DietCopy.noMealsLoggedToday));
      expect(DietCopy.noDietPlanMessage.toLowerCase(), contains('not assigned'));
      expect(DietCopy.noMealsLoggedToday.toLowerCase(), contains('logged'));
      expect(DietCopy.assignedDiet.toLowerCase(), contains('assigned'));
      expect(DietCopy.plannedDailyTarget.toLowerCase(), contains('planned'));
    });
  });

  group('Workout tip', () {
    test('fixed copy is a general tip, not personalized AI', () {
      final tip = WorkoutTip.resolve(null);
      expect(tip.title, WorkoutTip.heading);
      expect(tip.fromAssignedPlan, isFalse);
      expect(tip.caption, WorkoutTip.generalCaption);
      expect(tip.claimsPersonalizedAi, isFalse);
      final lower = '${tip.title} ${tip.body} ${tip.caption}'.toLowerCase();
      expect(lower.contains('neural'), isFalse);
      expect(lower.contains('personalized'), isFalse);
      expect(lower.contains('ai analysis'), isFalse);
      expect(lower.contains('neural coach'), isFalse);
    });

    test('uses assigned plan description when present', () {
      final tip = WorkoutTip.resolve('Tempo on the last set.');
      expect(tip.fromAssignedPlan, isTrue);
      expect(tip.body, 'Tempo on the last set.');
      expect(tip.caption, WorkoutTip.fromPlanCaption);
      expect(tip.claimsPersonalizedAi, isFalse);
    });
  });

  testWidgets('preview-unavailable is visible; food search uses assigned plan', (tester) async {
    await tester.pumpWidget(
      CupertinoApp(
        home: CupertinoPageScaffold(
          child: DietIntelPanelCompact(plan: _plan()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(DietCopy.previewUnavailable), findsWidgets);
    expect(find.text('Scan barcode'), findsOneWidget);
    expect(find.text('AI suggest'), findsOneWidget);
    expect(find.text('Analyze macros (preview)'), findsNothing);
    expect(find.textContaining('NEURAL'), findsNothing);

    await tester.enterText(find.byType(CupertinoSearchTextField), 'yogurt');
    await tester.pump();

    expect(find.text('Greek yogurt'), findsOneWidget);
    expect(find.textContaining('190 kcal planned'), findsOneWidget);
    expect(find.textContaining('Nutrition OS'), findsNothing);
    expect(find.textContaining('Hydration Matrix'), findsNothing);
    expect(find.textContaining('meal module'), findsNothing);
  });

  testWidgets('planned-only hero does not show consumed totals', (tester) async {
    await tester.pumpWidget(
      CupertinoApp(
        home: CupertinoPageScaffold(
          child: DietNutritionHero(plan: _plan()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(DietCopy.assignedDiet.toUpperCase()), findsOneWidget);
    expect(find.text(DietCopy.plannedDailyTarget.toUpperCase()), findsOneWidget);
    expect(find.text('kcal assigned'), findsOneWidget);
    expect(find.textContaining('consumed'), findsNothing);
    expect(find.textContaining('Consumed'), findsNothing);
  });

  testWidgets('workout tip card does not claim Neural Coach AI', (tester) async {
    await tester.pumpWidget(
      const CupertinoApp(
        home: CupertinoPageScaffold(
          child: WorkoutAiCoachCard(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(WorkoutTip.heading), findsOneWidget);
    expect(find.text(WorkoutTip.generalCaption), findsOneWidget);
    expect(find.textContaining('NEURAL COACH'), findsNothing);
    expect(find.textContaining('Neural'), findsNothing);
  });
}
