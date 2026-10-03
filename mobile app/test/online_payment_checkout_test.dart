import 'package:flutter_test/flutter_test.dart';
import 'package:pulsefit/core/api_exception.dart';
import 'package:pulsefit/features/membership/online_payment_checkout.dart';
import 'package:pulsefit/models/online_payment_models.dart';
import 'package:pulsefit/services/online_payment_service.dart';

MemberOnlinePaymentSummary _summary({
  required MemberPaymentNeed need,
  bool onlineEnabled = true,
  num outstanding = 1500,
  String message = '',
}) {
  return MemberOnlinePaymentSummary(
    onlinePaymentsEnabled: onlineEnabled,
    paymentNeed: need,
    message: message,
    membershipPaymentId: need == MemberPaymentNeed.settleOutstanding ? 41 : null,
    outstandingAmount: need == MemberPaymentNeed.settleOutstanding ? outstanding : 0,
  );
}

class _FakeGateway implements RazorpayCheckoutPort {
  _FakeGateway(this.result);
  final RazorpayCheckoutResult result;

  @override
  Future<RazorpayCheckoutResult> open(RazorpayOrder order) async => result;
}

OnlinePaymentService _service(
  Future<Map<String, dynamic>> Function(String method, String path, Map<String, dynamic>? body) handler,
) {
  return OnlinePaymentService(
    request: (method, path, {body}) => handler(method, path, body),
  );
}

void main() {
  group('BillingPayPresentation', () {
    test('outstanding shows Pay outstanding and enables checkout when online payments work', () {
      final ui = BillingPayPresentation.fromSummary(
        _summary(
          need: MemberPaymentNeed.settleOutstanding,
          message: 'You have an outstanding balance on your current membership bill.',
        ),
      );
      expect(ui.visible, isTrue);
      expect(ui.isOutstanding, isTrue);
      expect(ui.isRenewal, isFalse);
      expect(ui.showPayButton, isTrue);
      expect(ui.payEnabled, isTrue);
      expect(ui.title, 'Pay outstanding');
      expect(ui.unavailableReason, isNull);
    });

    test('outstanding disables checkout when online payments are unavailable', () {
      final ui = BillingPayPresentation.fromSummary(
        _summary(need: MemberPaymentNeed.settleOutstanding, onlineEnabled: false),
      );
      expect(ui.isOutstanding, isTrue);
      expect(ui.showPayButton, isTrue);
      expect(ui.payEnabled, isFalse);
      expect(ui.unavailableReason, contains('Online payments are not enabled'));
      expect(ui.unavailableReason, contains('front desk'));
    });

    test('renewal is not a payment button and does not add gym time via checkout', () {
      final ui = BillingPayPresentation.fromSummary(
        _summary(
          need: MemberPaymentNeed.renewalRequired,
          message: 'Your membership period has ended. Renewals are set up at reception.',
        ),
      );
      expect(ui.visible, isTrue);
      expect(ui.isRenewal, isTrue);
      expect(ui.isOutstanding, isFalse);
      expect(ui.showPayButton, isFalse);
      expect(ui.payEnabled, isFalse);
      expect(ui.title, 'Renew membership');
      expect(ui.body, contains('reception'));
    });
  });

  group('OnlinePaymentCheckout', () {
    final orderJson = <String, dynamic>{
      'orderId': 'order_1',
      'keyId': 'rzp_test',
      'amountPaise': 150000,
      'amount': 1500,
      'currency': 'INR',
      'membershipPaymentId': 41,
      'businessName': 'Tiger Fitness',
    };

    test('cancel / dismiss does not claim a charge and calls cancel', () async {
      var cancelled = false;
      final api = _service((method, path, body) async {
        if (method == 'POST' && path.endsWith('/order') && !path.contains('cancel')) {
          return orderJson;
        }
        if (method == 'POST' && path.contains('/cancel')) {
          cancelled = true;
          expect(path.contains('order_1'), isTrue);
          return {
            'orderId': 'order_1',
            'membershipPaymentId': 41,
            'status': 'cancelled',
            'message': 'Checkout was closed',
            'amount': 1500,
            'createdDate': '2026-10-03T10:00:00Z',
          };
        }
        fail('Unexpected $method $path');
      });
      final checkout = OnlinePaymentCheckout(
        api: api,
        gateway: _FakeGateway(const RazorpayCheckoutDismissedResult()),
        wait: (_) async {},
        confirmationAttempts: 1,
      );

      final outcome = await checkout.payOutstanding(membershipPaymentId: 41);
      expect(cancelled, isTrue);
      expect(outcome.kind, OnlinePaymentOutcomeKind.cancelled);
      expect(outcome.message, OnlinePaymentMessages.cancelled);
    });

    test('verify failure after checkout success does not claim paid', () async {
      final api = _service((method, path, body) async {
        if (method == 'POST' && path.endsWith('/order')) return orderJson;
        if (method == 'POST' && path.endsWith('/verify')) {
          throw const ApiException('Signature mismatch', statusCode: 400);
        }
        fail('Unexpected $method $path');
      });
      final checkout = OnlinePaymentCheckout(
        api: api,
        gateway: _FakeGateway(
          const RazorpayCheckoutPaidResult(
            RazorpayCheckoutPaid(
              razorpayOrderId: 'order_1',
              razorpayPaymentId: 'pay_1',
              razorpaySignature: 'sig',
            ),
          ),
        ),
        wait: (_) async {},
      );

      final outcome = await checkout.payOutstanding(membershipPaymentId: 41);
      expect(outcome.kind, isNot(OnlinePaymentOutcomeKind.completed));
      expect(outcome.kind, OnlinePaymentOutcomeKind.confirming);
      expect(outcome.message, OnlinePaymentMessages.verifyUnconfirmed);
      expect(outcome.message.toLowerCase(), isNot(contains('recorded')));
    });

    test('verify success:false stays unconfirmed', () async {
      final api = _service((method, path, body) async {
        if (method == 'POST' && path.endsWith('/order')) return orderJson;
        if (method == 'POST' && path.endsWith('/verify')) {
          return {
            'success': false,
            'message': 'Could not confirm with the bank.',
            'status': 'pending_verification',
            'orderId': 'order_1',
          };
        }
        fail('Unexpected $method $path');
      });
      final checkout = OnlinePaymentCheckout(
        api: api,
        gateway: _FakeGateway(
          const RazorpayCheckoutPaidResult(
            RazorpayCheckoutPaid(
              razorpayOrderId: 'order_1',
              razorpayPaymentId: 'pay_1',
              razorpaySignature: 'sig',
            ),
          ),
        ),
        wait: (_) async {},
      );

      final outcome = await checkout.payOutstanding();
      expect(outcome.kind, OnlinePaymentOutcomeKind.confirming);
      expect(outcome.message, contains('Could not confirm'));
    });

    test('status poll after interrupt uses server, not client success', () async {
      var statusHits = 0;
      final api = _service((method, path, body) async {
        if (method == 'GET' && path.contains('/orders/')) {
          statusHits += 1;
          return {
            'orderId': 'order_1',
            'membershipPaymentId': 41,
            'status': statusHits >= 2 ? 'completed' : 'pending_verification',
            'message': statusHits >= 2
                ? 'Payment recorded. Your outstanding balance has been updated.'
                : 'Payment received, confirming with the bank.',
            'amount': 1500,
            'createdDate': '2026-10-03T10:00:00Z',
          };
        }
        fail('Unexpected $method $path');
      });
      final checkout = OnlinePaymentCheckout(
        api: api,
        gateway: _FakeGateway(const RazorpayCheckoutDismissedResult()),
        wait: (_) async {},
        confirmationAttempts: 3,
      );

      final outcome = await checkout.waitForConfirmation('order_1');
      expect(statusHits, 2);
      expect(outcome.kind, OnlinePaymentOutcomeKind.completed);
    });
  });
}
