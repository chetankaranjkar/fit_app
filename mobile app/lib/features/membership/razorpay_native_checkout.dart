import 'dart:async';

import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../../models/online_payment_models.dart';
import 'online_payment_checkout.dart';

/// Official Razorpay Android/iOS checkout. JWT never leaves [ApiClient].
class NativeRazorpayCheckout implements RazorpayCheckoutPort {
  Razorpay? _active;

  @override
  Future<RazorpayCheckoutResult> open(RazorpayOrder order) {
    final razorpay = Razorpay();
    _active = razorpay;
    final completer = Completer<RazorpayCheckoutResult>();
    var settled = false;

    void settle(RazorpayCheckoutResult result) {
      if (settled) return;
      settled = true;
      razorpay.clear();
      if (_active == razorpay) _active = null;
      completer.complete(result);
    }

    razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, (PaymentSuccessResponse response) {
      settle(
        RazorpayCheckoutPaidResult(
          RazorpayCheckoutPaid(
            razorpayOrderId: response.orderId ?? order.orderId,
            razorpayPaymentId: response.paymentId ?? '',
            razorpaySignature: response.signature ?? '',
          ),
        ),
      );
    });
    razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (_) {
      settle(const RazorpayCheckoutDismissedResult());
    });
    razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, (_) {});

    razorpay.open(<String, dynamic>{
      'key': order.keyId,
      'amount': order.amountPaise,
      'currency': order.currency,
      'name': order.businessName,
      'description': 'Outstanding membership balance',
      'order_id': order.orderId,
      'prefill': {
        if (order.memberName != null && order.memberName!.isNotEmpty) 'name': order.memberName,
        if (order.memberEmail != null && order.memberEmail!.isNotEmpty) 'email': order.memberEmail,
        if (order.memberPhone != null && order.memberPhone!.isNotEmpty) 'contact': order.memberPhone,
      },
      'theme': {'color': '#F5C400'},
    });

    return completer.future;
  }
}
