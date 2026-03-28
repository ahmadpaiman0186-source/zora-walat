/// Server-side [Stripe PaymentIntent] metadata for the recharge-review flow.
abstract final class RechargeDraftConstants {
  static const String productId = 'recharge_draft_v1';
  static const String serviceLine = 'recharge_home';
}

/// Snapshot of the recharge home form for the review / checkout step.
class RechargeDraft {
  const RechargeDraft({
    required this.phoneE164Style,
    required this.operatorKey,
    required this.operatorLabel,
    required this.amountUsd,
  });

  final String phoneE164Style;
  final String operatorKey;
  final String operatorLabel;
  final double amountUsd;
}
