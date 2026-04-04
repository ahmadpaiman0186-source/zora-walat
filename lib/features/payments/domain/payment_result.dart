/// UI result: in-app PaymentSheet (mobile/desktop), hosted Stripe Checkout (web), or failure/cancel.
sealed class PaymentResult {
  const PaymentResult();

  bool get isSuccess => this is PaymentSuccess;
}

class PaymentSuccess extends PaymentResult {
  const PaymentSuccess({this.paymentIntentId});

  /// Populated when the PSP returns an intent id (extend Stripe flow as needed).
  final String? paymentIntentId;
}

/// Web only: user was redirected to Stripe Checkout; confirm via return URL or backend webhooks.
class PaymentHostedCheckoutRedirect extends PaymentResult {
  const PaymentHostedCheckoutRedirect();
}

class PaymentFailure extends PaymentResult {
  const PaymentFailure(this.message);

  final String message;
}

class PaymentCancelled extends PaymentResult {
  const PaymentCancelled();
}
