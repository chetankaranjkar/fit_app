import '../core/api_client.dart';
import '../core/api_exception.dart';
import '../models/online_payment_models.dart';

typedef OnlinePaymentHttp = Future<Map<String, dynamic>> Function(
  String method,
  String path, {
  Map<String, dynamic>? body,
});

/// Authenticated Razorpay member APIs. Uses [ApiClient] (existing JWT interceptors).
class OnlinePaymentService {
  OnlinePaymentService({OnlinePaymentHttp? request}) : _request = request ?? _apiRequest;

  static final OnlinePaymentService instance = OnlinePaymentService();

  final OnlinePaymentHttp _request;

  Future<MemberOnlinePaymentSummary> getSummary() async {
    final data = await _request('GET', '/me/payments/razorpay/summary');
    return MemberOnlinePaymentSummary.fromJson(data);
  }

  Future<RazorpayOrder> createOrder({int? membershipPaymentId}) async {
    final data = await _request(
      'POST',
      '/me/payments/razorpay/order',
      body: {
        if (membershipPaymentId != null) 'membershipPaymentId': membershipPaymentId,
      },
    );
    return RazorpayOrder.fromJson(data);
  }

  Future<RazorpayVerifyResult> verify({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    final data = await _request(
      'POST',
      '/me/payments/razorpay/verify',
      body: {
        'razorpayOrderId': razorpayOrderId,
        'razorpayPaymentId': razorpayPaymentId,
        'razorpaySignature': razorpaySignature,
      },
    );
    return RazorpayVerifyResult.fromJson(data);
  }

  Future<OnlinePaymentAttempt> getOrderStatus(String orderId) async {
    final encoded = Uri.encodeComponent(orderId);
    final data = await _request('GET', '/me/payments/razorpay/orders/$encoded');
    return OnlinePaymentAttempt.fromJson(data);
  }

  Future<OnlinePaymentAttempt> cancelOrder(String orderId) async {
    final encoded = Uri.encodeComponent(orderId);
    final data = await _request('POST', '/me/payments/razorpay/orders/$encoded/cancel');
    return OnlinePaymentAttempt.fromJson(data);
  }

  static Future<Map<String, dynamic>> _apiRequest(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    switch (method) {
      case 'GET':
        final res = await ApiClient.instance.get<Map<String, dynamic>>(path);
        return res.data ?? <String, dynamic>{};
      case 'POST':
        final res = await ApiClient.instance.post<Map<String, dynamic>>(path, body: body);
        return res.data ?? <String, dynamic>{};
      default:
        throw ApiException('Unsupported HTTP method $method');
    }
  }
}
