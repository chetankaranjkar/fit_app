import '../../core/api_exception.dart';
import '../../models/online_payment_models.dart';
import '../../services/online_payment_service.dart';

abstract class RazorpayCheckoutPort {
  Future<RazorpayCheckoutResult> open(RazorpayOrder order);
}

class OnlinePaymentMessages {
  OnlinePaymentMessages._();

  static const confirming =
      'Payment received, confirming with the bank. This usually takes under a minute.';
  static const cancelled = 'Checkout closed. No payment was completed.';
  static const verifyUnconfirmed =
      'We could not confirm this payment. Do not assume the bill is paid. '
      'Contact the front desk or tap Check status.';
}

/// Mirrors web `useRazorpayCheckout`: create order → checkout → verify/cancel → status poll.
class OnlinePaymentCheckout {
  OnlinePaymentCheckout({
    required OnlinePaymentService api,
    required RazorpayCheckoutPort gateway,
    this.wait = _defaultWait,
    this.confirmationAttempts = 5,
  })  : _api = api,
        _gateway = gateway;

  final OnlinePaymentService _api;
  final RazorpayCheckoutPort _gateway;
  final Future<void> Function(Duration duration) wait;
  final int confirmationAttempts;

  static Future<void> _defaultWait(Duration duration) => Future<void>.delayed(duration);

  Future<OnlinePaymentOutcome> checkStatus(String orderId) async {
    final attempt = await _api.getOrderStatus(orderId);
    return OnlinePaymentOutcome(
      kind: outcomeKindFromStatus(attempt.status),
      message: attempt.message.isNotEmpty ? attempt.message : OnlinePaymentMessages.confirming,
      orderId: orderId,
    );
  }

  Future<OnlinePaymentOutcome> waitForConfirmation(String orderId) async {
    var last = OnlinePaymentOutcome(
      kind: OnlinePaymentOutcomeKind.confirming,
      message: OnlinePaymentMessages.confirming,
      orderId: orderId,
    );
    for (var i = 0; i < confirmationAttempts; i++) {
      await wait(Duration(milliseconds: 2000 + i * 2000));
      try {
        last = await checkStatus(orderId);
      } on ApiException {
        continue;
      }
      if (last.kind != OnlinePaymentOutcomeKind.confirming) return last;
    }
    if (last.kind == OnlinePaymentOutcomeKind.confirming) {
      return OnlinePaymentOutcome(
        kind: OnlinePaymentOutcomeKind.confirming,
        message: OnlinePaymentMessages.verifyUnconfirmed,
        orderId: orderId,
      );
    }
    return last;
  }

  Future<OnlinePaymentOutcome> payOutstanding({int? membershipPaymentId}) async {
    final order = await _api.createOrder(membershipPaymentId: membershipPaymentId);
    final result = await _gateway.open(order);

    if (result is RazorpayCheckoutDismissedResult) {
      try {
        final cancelled = await _api.cancelOrder(order.orderId);
        final kind = outcomeKindFromStatus(cancelled.status);
        if (kind != OnlinePaymentOutcomeKind.cancelled && kind != OnlinePaymentOutcomeKind.pending) {
          return OnlinePaymentOutcome(
            kind: kind,
            message: cancelled.message,
            orderId: order.orderId,
          );
        }
      } on ApiException {
        // Cancellation is best-effort; hosted reconciliation still runs.
      }
      return OnlinePaymentOutcome(
        kind: OnlinePaymentOutcomeKind.cancelled,
        message: OnlinePaymentMessages.cancelled,
        orderId: order.orderId,
      );
    }

    if (result is RazorpayCheckoutPaidResult) {
      try {
        final verified = await _api.verify(
          razorpayOrderId: result.payload.razorpayOrderId,
          razorpayPaymentId: result.payload.razorpayPaymentId,
          razorpaySignature: result.payload.razorpaySignature,
        );
        if (!verified.success) {
          final kind = outcomeKindFromStatus(verified.status);
          if (kind == OnlinePaymentOutcomeKind.completed) {
            return OnlinePaymentOutcome(
              kind: OnlinePaymentOutcomeKind.confirming,
              message: OnlinePaymentMessages.verifyUnconfirmed,
              orderId: order.orderId,
            );
          }
          return OnlinePaymentOutcome(
            kind: kind == OnlinePaymentOutcomeKind.pending
                ? OnlinePaymentOutcomeKind.confirming
                : kind,
            message: verified.message.isNotEmpty
                ? verified.message
                : OnlinePaymentMessages.verifyUnconfirmed,
            orderId: order.orderId,
          );
        }
        return OnlinePaymentOutcome(
          kind: outcomeKindFromStatus(verified.status),
          message: verified.message,
          orderId: order.orderId,
        );
      } on ApiException {
        return OnlinePaymentOutcome(
          kind: OnlinePaymentOutcomeKind.confirming,
          message: OnlinePaymentMessages.verifyUnconfirmed,
          orderId: order.orderId,
        );
      }
    }

    return OnlinePaymentOutcome(
      kind: OnlinePaymentOutcomeKind.cancelled,
      message: OnlinePaymentMessages.cancelled,
      orderId: order.orderId,
    );
  }
}
