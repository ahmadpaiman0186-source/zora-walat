import '../core/utils/receiving_country_phone.dart';

/// Server-side [Stripe PaymentIntent] metadata for the recharge-review flow.
abstract final class RechargeDraftConstants {
  static const String productId = 'recharge_draft_v1';
  static const String serviceLine = 'recharge_home';
}

/// Snapshot of the recharge home form for the review / checkout step.
class RechargeDraft {
  const RechargeDraft({
    required this.phoneE164Style,
    required this.receivingCountryIso,
    required this.localPhoneRaw,
    required this.operatorKey,
    required this.operatorLabel,
    required this.amountUsd,
  });

  /// API / Stripe payload (unchanged semantics — see [RechargePhoneComposer.phonePayloadForApi]).
  final String phoneE164Style;

  /// ISO 3166-1 alpha-2 for the receiving country (dial prefix UX).
  final String receivingCountryIso;

  /// Local digits the user entered (prefix excluded). Used only for [recipientDisplayPhone].
  final String localPhoneRaw;

  final String operatorKey;
  final String operatorLabel;
  final double amountUsd;

  /// Formatted recipient line for summary UI (`+93 …` etc.). Does not replace [phoneE164Style] for APIs.
  String get recipientDisplayPhone {
    final local =
        localPhoneRaw.trim().isNotEmpty ? localPhoneRaw : phoneE164Style;
    return RechargePhoneComposer.displayPretty(
      country: receivingCountryByIso(receivingCountryIso),
      localRaw: local,
    );
  }
}
