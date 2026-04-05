import 'package:intl/intl.dart';

import 'order_sync_source.dart';

/// Unified row for order center list + detail (cloud truth or local fallback).
class OrderCenterRow {
  const OrderCenterRow({
    required this.orderId,
    required this.syncSource,
    this.trackingStageKey,
    this.storedStatusHeadline,
    this.paymentStateLabel,
    this.fulfillmentStateLabel,
    this.operatorLabel,
    this.phoneMasked,
    this.amountLabel,
    this.providerReferenceSuffix,
    required this.updatedAtIso,
    this.failureReason,
  });

  final String orderId;
  final OrderSyncSource syncSource;

  /// Customer-safe stage key from server (`trackingStageKey`) or local cache.
  final String? trackingStageKey;

  /// Device-local headline from checkout flow; cloud rows derive from [trackingStageKey].
  final String? storedStatusHeadline;

  final String? paymentStateLabel;
  final String? fulfillmentStateLabel;
  final String? operatorLabel;
  final String? phoneMasked;
  final String? amountLabel;
  final String? providerReferenceSuffix;
  final String updatedAtIso;

  /// Customer-safe message from server when present.
  final String? failureReason;

  factory OrderCenterRow.fromServerPayload(Map<String, dynamic> json) {
    final id = (json['orderReference'] ?? json['orderId']) as String? ?? '';
    final cents = json['amountUsdCents'];
    final currency = json['currency'] as String?;
    final amountLabel = _formatMoney(cents, currency);
    final updated =
        (json['updatedAtIso'] as String?) ??
        _isoFromDynamic(json['updatedAt']);

    return OrderCenterRow(
      orderId: id,
      syncSource: OrderSyncSource.account,
      trackingStageKey: json['trackingStageKey'] as String?,
      paymentStateLabel: json['paymentStatusLabel'] as String?,
      fulfillmentStateLabel: json['fulfillmentStatusLabel'] as String?,
      operatorLabel: _humanizeOperatorKey(json['operatorKey'] as String?),
      phoneMasked: json['recipientMasked'] as String?,
      amountLabel: amountLabel,
      providerReferenceSuffix: json['providerReferenceSuffix'] as String?,
      updatedAtIso: updated ?? DateTime.now().toUtc().toIso8601String(),
      failureReason: json['failureReason'] as String?,
    );
  }

  factory OrderCenterRow.fromLocalCache(Map<String, dynamic> m) {
    final id = (m['orderId'] as String?)?.trim() ?? '';
    final updated = (m['updatedAt'] as String?) ?? '';
    return OrderCenterRow(
      orderId: id,
      syncSource: OrderSyncSource.device,
      trackingStageKey: m['trackingStageKey'] as String?,
      storedStatusHeadline: m['statusHeadline'] as String?,
      paymentStateLabel: m['paymentStateLabel'] as String?,
      fulfillmentStateLabel: m['fulfillmentStateLabel'] as String?,
      operatorLabel: m['operatorLabel'] as String?,
      phoneMasked: m['phoneMasked'] as String?,
      amountLabel: m['amountLabel'] as String?,
      providerReferenceSuffix: m['providerReferenceSuffix'] as String?,
      updatedAtIso: updated.isNotEmpty ? updated : DateTime.now().toUtc().toIso8601String(),
    );
  }

  static String? _isoFromDynamic(Object? v) {
    if (v == null) return null;
    if (v is String) return v;
    return null;
  }

  static String? _formatMoney(Object? centsRaw, String? currency) {
    if (centsRaw == null) return null;
    final cents = centsRaw is int ? centsRaw : int.tryParse('$centsRaw');
    if (cents == null) return null;
    final code = (currency != null && currency.isNotEmpty) ? currency : 'USD';
    final fmt = NumberFormat.simpleCurrency(name: code);
    return fmt.format(cents / 100.0);
  }

  static String? _humanizeOperatorKey(String? key) {
    if (key == null || key.trim().isEmpty) return null;
    return key.replaceAll('_', ' ').trim();
  }
}

class OrderCenterLoadResult {
  const OrderCenterLoadResult({
    required this.orders,
    this.cloudRefreshFailed = false,
  });

  static const empty = OrderCenterLoadResult(orders: <OrderCenterRow>[]);

  final List<OrderCenterRow> orders;

  /// True when signed in but network/API failed; [orders] may be local-only.
  final bool cloudRefreshFailed;
}
