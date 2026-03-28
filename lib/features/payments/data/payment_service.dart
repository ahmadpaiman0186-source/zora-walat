import '../../../models/recharge_draft.dart';
import '../../telecom/domain/telecom_order.dart';
import '../domain/payment_result.dart';

/// Abstraction for checkout. Swap implementations for tests or alternative PSPs.
abstract class PaymentService {
  /// Present Stripe PaymentSheet (or your flow) for [order].
  Future<PaymentResult> pay(TelecomOrder order);

  /// Recharge home → review flow (amount + phone + operator); server creates PI.
  Future<PaymentResult> payRechargeDraft(RechargeDraft draft);
}
