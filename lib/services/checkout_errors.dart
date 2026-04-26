/// Thrown when `POST /create-checkout-session` returns 503 with [payments_lockdown] code.
class PaymentsLockdownException implements Exception {
  const PaymentsLockdownException(this.message);
  final String message;
  @override
  String toString() => message;
}
