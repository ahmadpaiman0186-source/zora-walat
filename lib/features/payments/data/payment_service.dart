import '../../telecom/domain/telecom_order.dart';
import '../domain/payment_result.dart';

/// Abstraction for checkout. Swap implementations for tests or alternative PSPs.
abstract class PaymentService {
  /// Present Stripe PaymentSheet (or your flow) for [order].
  Future<PaymentResult> pay(TelecomOrder order);
}
