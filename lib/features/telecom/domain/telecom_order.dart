import 'package:flutter/foundation.dart';

import 'mobile_operator.dart';
import 'phone_number.dart';
import 'telecom_service_line.dart';

@immutable
class TelecomOrder {
  const TelecomOrder({
    required this.line,
    required this.operator,
    required this.phone,
    required this.productId,
    required this.productTitle,
    required this.finalUsdCents,
    required this.metadata,
  });

  final TelecomServiceLine line;
  final MobileOperator operator;
  final PhoneNumber phone;
  final String productId;
  final String productTitle;
  final int finalUsdCents;

  /// Merged into Stripe PaymentIntent metadata and fulfillment APIs.
  final Map<String, String> metadata;
}
