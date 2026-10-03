import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pulsefit/core/api_exception.dart';
import 'package:pulsefit/core/member_access.dart';
import 'package:pulsefit/features/health/health_profile_screen.dart';
import 'package:pulsefit/features/supplements/assigned_supplements_screen.dart';
import 'package:pulsefit/models/health_profile_models.dart';
import 'package:pulsefit/models/member_supplement_models.dart';
import 'package:pulsefit/providers/health_providers.dart';
import 'package:pulsefit/services/health_profile_service.dart';
import 'package:pulsefit/services/member_supplements_service.dart';

Widget _wrap(Widget home, List<Override> overrides) {
  return TickerMode(
    enabled: false,
    child: ProviderScope(
      overrides: overrides,
      child: CupertinoApp(home: home),
    ),
  );
}

void main() {
  group('ownership endpoints', () {
    test('health and supplements use token-scoped /me only', () {
      expect(HealthProfileEndpoints.me, '/HealthProfile/me');
      expect(HealthProfileService.mePath, '/HealthProfile/me');
      expect(MemberSupplementEndpoints.me, '/MemberSupplements/me');
      expect(MemberSupplementsService.mePath, '/MemberSupplements/me');
      expect(HealthProfileService.mePath.contains('/user/'), isFalse);
      expect(MemberSupplementsService.mePath.contains('/user/'), isFalse);
      expect(HealthProfileService.mePath.contains('{'), isFalse);
      expect(MemberSupplementsService.mePath.contains('{'), isFalse);
    });

    test('upsert payload never includes a target userId', () {
      final profile = HealthProfile.fromJson({
        'id': 1,
        'userId': 999,
        'healthOverview': 'own notes',
        'riskLevel': 'Low',
        'exerciseRestrictions': <String>[],
        'isCompleted': true,
        'medicalConditions': <dynamic>[],
        'medications': <dynamic>[],
        'injuries': <dynamic>[],
        'emergencyContacts': <dynamic>[],
      });
      final payload = profile.toDraft().toPayload();
      expect(payload.containsKey('userId'), isFalse);
      expect(payload['healthOverview'], 'own notes');
    });
  });

  group('health 404 empty form', () {
    test('empty own form has no other member identity', () {
      final empty = HealthProfile.empty();
      expect(empty.isCompleted, isFalse);
      expect(empty.emergencyContacts, isNotEmpty);
      final payload = empty.toDraft().toPayload();
      expect(payload.containsKey('userId'), isFalse);
    });
  });

  group('403 copy', () {
    test('forbidden does not surface another member name', () {
      const err = ApiException('Health for Jordan Smith', statusCode: 403);
      expect(MemberAccessCopy.isForbidden(err), isTrue);
      expect(MemberAccessCopy.message(err), MemberAccessCopy.accessDeniedBody);
      expect(MemberAccessCopy.message(err).toLowerCase().contains('jordan'), isFalse);
    });
  });

  group('HealthProfileScreen', () {
    testWidgets('own profile loads editable overview', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const HealthProfileScreen(),
          [
            healthProfileProvider.overrideWith(
              (ref) async => HealthProfile.fromJson({
                'healthOverview': 'Knee caution on squats',
                'riskLevel': 'Moderate',
                'exerciseRestrictions': <String>[],
                'isCompleted': true,
                'medicalConditions': <dynamic>[],
                'medications': <dynamic>[],
                'injuries': <dynamic>[],
                'emergencyContacts': <dynamic>[],
              }),
            ),
          ],
        ),
      );
      await tester.pump();
      expect(find.text('Health Overview'), findsOneWidget);
      expect(find.text('Knee caution on squats'), findsOneWidget);
      expect(find.text('Continue'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    });

    testWidgets('403 shows access denied without another name', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const HealthProfileScreen(),
          [
            healthProfileProvider.overrideWith(
              (ref) async => throw const ApiException('Profile for Alex Other', statusCode: 403),
            ),
          ],
        ),
      );
      await tester.pump();
      expect(find.text(MemberAccessCopy.accessDeniedTitle), findsOneWidget);
      expect(find.textContaining('Alex'), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  });

  group('AssignedSupplementsScreen', () {
    testWidgets('assigned protocol is read-only with coach labels', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const AssignedSupplementsScreen(),
          [
            assignedSupplementsProvider.overrideWith(
              (ref) async => [
                MemberSupplementAssignment.fromJson({
                  'id': 4,
                  'userId': 12,
                  'memberName': 'Should Not Show',
                  'supplementName': 'Whey Isolate',
                  'category': 'Protein',
                  'dosage': '30g',
                  'timing': 'PostWorkout',
                  'timingLabel': 'After workout',
                  'startDate': '2026-10-01',
                  'status': 'Active',
                  'isCurrentlyActive': true,
                  'assignedByName': 'Coach Priya',
                  'instructions': 'Mix with water',
                }),
              ],
            ),
          ],
        ),
      );
      await tester.pump();
      expect(find.text('Whey Isolate'), findsOneWidget);
      expect(find.textContaining('Coach Priya'), findsOneWidget);
      expect(find.text('After workout'), findsOneWidget);
      expect(find.text('Should Not Show'), findsNothing);
      expect(find.text('Save'), findsNothing);
      expect(find.byType(CupertinoTextField), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    });

    testWidgets('empty assigned protocol', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const AssignedSupplementsScreen(),
          [
            assignedSupplementsProvider.overrideWith((ref) async => const []),
          ],
        ),
      );
      await tester.pump();
      expect(find.text('No protocol assigned yet'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    });

    testWidgets('403 empty access denied', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const AssignedSupplementsScreen(),
          [
            assignedSupplementsProvider.overrideWith(
              (ref) async => throw const ApiException('List for Alex Other', statusCode: 403),
            ),
          ],
        ),
      );
      await tester.pump();
      expect(find.text(MemberAccessCopy.accessDeniedTitle), findsOneWidget);
      expect(find.textContaining('Alex'), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  });
}
