import 'package:flutter_test/flutter_test.dart';
import 'package:pulsefit/models/me_models.dart';

void main() {
  test('member profile keeps the home branch name from the API', () {
    final profile = MeProfile.fromJson({
      'userId': 4,
      'firstName': 'Asha',
      'lastName': 'Nair',
      'fullName': 'Asha Nair',
      'email': 'asha@example.com',
      'registrationDate': '2026-01-01T00:00:00Z',
      'homeBranchId': 2,
      'homeBranchName': 'North',
    });

    expect(profile.homeBranchId, 2);
    expect(profile.homeBranchName, 'North');
  });

  test('member profile allows an unassigned home branch', () {
    final profile = MeProfile.fromJson({
      'userId': 5,
      'firstName': 'Old',
      'lastName': 'Record',
      'fullName': 'Old Record',
      'email': 'old@example.com',
      'registrationDate': '2026-01-01T00:00:00Z',
    });

    expect(profile.homeBranchId, isNull);
    expect(profile.homeBranchName, isNull);
  });
}
