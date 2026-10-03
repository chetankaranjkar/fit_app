// Member Razorpay payloads from `/api/me/payments/razorpay/*`.

enum MemberPaymentNeed {
  settleOutstanding,
  renewalRequired,
  billingClosed,
  nothingDue,
}

enum OnlinePaymentAttemptStatus {
  pending,
  completed,
  failed,
  pendingVerification,
  processing,
  cancelled,
  reviewRequired,
}

enum OnlinePaymentOutcomeKind {
  completed,
  confirming,
  review,
  cancelled,
  failed,
  pending,
}

class OnlinePaymentAttempt {
  const OnlinePaymentAttempt({
    required this.orderId,
    required this.membershipPaymentId,
    required this.status,
    required this.message,
    required this.amount,
    this.capturedAmount,
    required this.createdDate,
    this.updatedDate,
  });

  final String orderId;
  final int membershipPaymentId;
  final OnlinePaymentAttemptStatus status;
  final String message;
  final num amount;
  final num? capturedAmount;
  final DateTime createdDate;
  final DateTime? updatedDate;

  factory OnlinePaymentAttempt.fromJson(Map<String, dynamic> json) {
    return OnlinePaymentAttempt(
      orderId: json['orderId']?.toString() ?? '',
      membershipPaymentId: _asInt(json['membershipPaymentId']) ?? 0,
      status: parseAttemptStatus(json['status']?.toString()),
      message: json['message']?.toString() ?? '',
      amount: json['amount'] is num ? json['amount'] as num : 0,
      capturedAmount: json['capturedAmount'] is num ? json['capturedAmount'] as num : null,
      createdDate: _asDate(json['createdDate']) ?? DateTime.fromMillisecondsSinceEpoch(0),
      updatedDate: _asDate(json['updatedDate']),
    );
  }
}

class MemberOnlinePaymentSummary {
  const MemberOnlinePaymentSummary({
    required this.onlinePaymentsEnabled,
    required this.paymentNeed,
    required this.message,
    this.membershipPaymentId,
    required this.outstandingAmount,
    this.nextDueDate,
    this.planName,
    this.membershipStatus,
    this.membershipEndDate,
    this.latestAttempt,
  });

  final bool onlinePaymentsEnabled;
  final MemberPaymentNeed paymentNeed;
  final String message;
  final int? membershipPaymentId;
  final num outstandingAmount;
  final DateTime? nextDueDate;
  final String? planName;
  final String? membershipStatus;
  final DateTime? membershipEndDate;
  final OnlinePaymentAttempt? latestAttempt;

  factory MemberOnlinePaymentSummary.fromJson(Map<String, dynamic> json) {
    final attemptRaw = json['latestAttempt'];
    return MemberOnlinePaymentSummary(
      onlinePaymentsEnabled: json['onlinePaymentsEnabled'] == true,
      paymentNeed: parsePaymentNeed(json['paymentNeed']?.toString()),
      message: json['message']?.toString() ?? '',
      membershipPaymentId: _asInt(json['membershipPaymentId']),
      outstandingAmount: json['outstandingAmount'] is num ? json['outstandingAmount'] as num : 0,
      nextDueDate: _asDate(json['nextDueDate']),
      planName: json['planName']?.toString(),
      membershipStatus: json['membershipStatus']?.toString(),
      membershipEndDate: _asDate(json['membershipEndDate']),
      latestAttempt: attemptRaw is Map<String, dynamic>
          ? OnlinePaymentAttempt.fromJson(attemptRaw)
          : null,
    );
  }
}

class RazorpayOrder {
  const RazorpayOrder({
    required this.orderId,
    required this.keyId,
    required this.amountPaise,
    required this.amount,
    required this.currency,
    required this.membershipPaymentId,
    required this.businessName,
    this.memberEmail,
    this.memberPhone,
    this.memberName,
  });

  final String orderId;
  final String keyId;
  final int amountPaise;
  final num amount;
  final String currency;
  final int membershipPaymentId;
  final String businessName;
  final String? memberEmail;
  final String? memberPhone;
  final String? memberName;

  factory RazorpayOrder.fromJson(Map<String, dynamic> json) {
    return RazorpayOrder(
      orderId: json['orderId']?.toString() ?? '',
      keyId: json['keyId']?.toString() ?? '',
      amountPaise: _asInt(json['amountPaise']) ?? 0,
      amount: json['amount'] is num ? json['amount'] as num : 0,
      currency: json['currency']?.toString() ?? 'INR',
      membershipPaymentId: _asInt(json['membershipPaymentId']) ?? 0,
      businessName: json['businessName']?.toString() ?? '',
      memberEmail: json['memberEmail']?.toString(),
      memberPhone: json['memberPhone']?.toString(),
      memberName: json['memberName']?.toString(),
    );
  }
}

class RazorpayVerifyResult {
  const RazorpayVerifyResult({
    required this.success,
    required this.message,
    required this.status,
    this.orderId,
  });

  final bool success;
  final String message;
  final OnlinePaymentAttemptStatus status;
  final String? orderId;

  factory RazorpayVerifyResult.fromJson(Map<String, dynamic> json) {
    return RazorpayVerifyResult(
      success: json['success'] == true,
      message: json['message']?.toString() ?? '',
      status: parseAttemptStatus(json['status']?.toString()),
      orderId: json['orderId']?.toString(),
    );
  }
}

class OnlinePaymentOutcome {
  const OnlinePaymentOutcome({
    required this.kind,
    required this.message,
    required this.orderId,
  });

  final OnlinePaymentOutcomeKind kind;
  final String message;
  final String orderId;
}

class RazorpayCheckoutPaid {
  const RazorpayCheckoutPaid({
    required this.razorpayOrderId,
    required this.razorpayPaymentId,
    required this.razorpaySignature,
  });

  final String razorpayOrderId;
  final String razorpayPaymentId;
  final String razorpaySignature;
}

sealed class RazorpayCheckoutResult {
  const RazorpayCheckoutResult();
}

class RazorpayCheckoutPaidResult extends RazorpayCheckoutResult {
  const RazorpayCheckoutPaidResult(this.payload);
  final RazorpayCheckoutPaid payload;
}

class RazorpayCheckoutDismissedResult extends RazorpayCheckoutResult {
  const RazorpayCheckoutDismissedResult();
}

/// UI copy and affordances derived from the server summary (no network).
class BillingPayPresentation {
  const BillingPayPresentation({
    required this.visible,
    required this.title,
    required this.body,
    required this.showPayButton,
    required this.payEnabled,
    this.payButtonLabel,
    this.unavailableReason,
    required this.isRenewal,
    required this.isOutstanding,
  });

  final bool visible;
  final String title;
  final String body;
  final bool showPayButton;
  final bool payEnabled;
  final String? payButtonLabel;
  final String? unavailableReason;
  final bool isRenewal;
  final bool isOutstanding;

  factory BillingPayPresentation.fromSummary(MemberOnlinePaymentSummary summary) {
    switch (summary.paymentNeed) {
      case MemberPaymentNeed.settleOutstanding:
        final enabled = summary.onlinePaymentsEnabled;
        return BillingPayPresentation(
          visible: true,
          title: 'Pay outstanding',
          body: summary.message.isNotEmpty
              ? summary.message
              : 'Settle the balance on your current membership bill. Paying does not add gym time.',
          showPayButton: true,
          payEnabled: enabled,
          payButtonLabel: enabled ? 'Pay outstanding' : 'Pay outstanding',
          unavailableReason: enabled
              ? null
              : 'Online payments are not enabled. Please contact the front desk to complete payment.',
          isRenewal: false,
          isOutstanding: true,
        );
      case MemberPaymentNeed.renewalRequired:
        return BillingPayPresentation(
          visible: true,
          title: 'Renew membership',
          body: summary.message.isNotEmpty
              ? summary.message
              : 'Your membership period has ended. Renewals are set up at reception; paying a bill does not add gym time.',
          showPayButton: false,
          payEnabled: false,
          unavailableReason: null,
          isRenewal: true,
          isOutstanding: false,
        );
      case MemberPaymentNeed.billingClosed:
        return BillingPayPresentation(
          visible: true,
          title: 'Billing closed',
          body: summary.message.isNotEmpty
              ? summary.message
              : 'This membership\'s billing is closed. Please contact the front desk.',
          showPayButton: false,
          payEnabled: false,
          isRenewal: false,
          isOutstanding: false,
        );
      case MemberPaymentNeed.nothingDue:
        return const BillingPayPresentation(
          visible: false,
          title: '',
          body: '',
          showPayButton: false,
          payEnabled: false,
          isRenewal: false,
          isOutstanding: false,
        );
    }
  }
}

MemberPaymentNeed parsePaymentNeed(String? raw) {
  switch (raw) {
    case 'settle_outstanding':
      return MemberPaymentNeed.settleOutstanding;
    case 'renewal_required':
      return MemberPaymentNeed.renewalRequired;
    case 'billing_closed':
      return MemberPaymentNeed.billingClosed;
    default:
      return MemberPaymentNeed.nothingDue;
  }
}

OnlinePaymentAttemptStatus parseAttemptStatus(String? raw) {
  switch (raw) {
    case 'completed':
      return OnlinePaymentAttemptStatus.completed;
    case 'failed':
      return OnlinePaymentAttemptStatus.failed;
    case 'pending_verification':
      return OnlinePaymentAttemptStatus.pendingVerification;
    case 'processing':
      return OnlinePaymentAttemptStatus.processing;
    case 'cancelled':
      return OnlinePaymentAttemptStatus.cancelled;
    case 'review_required':
      return OnlinePaymentAttemptStatus.reviewRequired;
    default:
      return OnlinePaymentAttemptStatus.pending;
  }
}

OnlinePaymentOutcomeKind outcomeKindFromStatus(OnlinePaymentAttemptStatus status) {
  switch (status) {
    case OnlinePaymentAttemptStatus.completed:
      return OnlinePaymentOutcomeKind.completed;
    case OnlinePaymentAttemptStatus.pendingVerification:
    case OnlinePaymentAttemptStatus.processing:
      return OnlinePaymentOutcomeKind.confirming;
    case OnlinePaymentAttemptStatus.reviewRequired:
      return OnlinePaymentOutcomeKind.review;
    case OnlinePaymentAttemptStatus.cancelled:
      return OnlinePaymentOutcomeKind.cancelled;
    case OnlinePaymentAttemptStatus.failed:
      return OnlinePaymentOutcomeKind.failed;
    case OnlinePaymentAttemptStatus.pending:
      return OnlinePaymentOutcomeKind.pending;
  }
}

int? _asInt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v);
  return null;
}

DateTime? _asDate(dynamic v) {
  if (v == null) return null;
  if (v is DateTime) return v;
  if (v is String) return DateTime.tryParse(v);
  return null;
}
