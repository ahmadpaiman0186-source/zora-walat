sealed class PaymentResult {
  const PaymentResult();

  bool get isSuccess => this is PaymentSuccess;
}

class PaymentSuccess extends PaymentResult {
  const PaymentSuccess({this.paymentIntentId});

  /// Populated when the PSP returns an intent id (extend Stripe flow as needed).
  final String? paymentIntentId;
}

class PaymentFailure extends PaymentResult {
  const PaymentFailure(this.message);

  final String message;
}

class PaymentCancelled extends PaymentResult {
  const PaymentCancelled();
}
