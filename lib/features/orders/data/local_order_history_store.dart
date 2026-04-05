import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Lightweight local receipt list (device-only) until a server order list API exists.
class LocalOrderHistoryStore {
  LocalOrderHistoryStore(this._prefs);

  final SharedPreferences _prefs;
  static const _key = 'zw_order_history_v1';
  static const _maxItems = 48;

  List<Map<String, dynamic>> _readRaw() {
    final raw = _prefs.getString(_key);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .map((e) => Map<String, dynamic>.from(e as Map<dynamic, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _write(List<Map<String, dynamic>> list) async {
    await _prefs.setString(_key, jsonEncode(list));
  }

  static String? _trimOrNull(String? s) {
    final t = s?.trim();
    if (t == null || t.isEmpty) return null;
    return t;
  }

  /// Record or refresh an order after checkout return / status refresh.
  Future<void> upsertOrder({
    required String orderId,
    String? checkoutSessionId,
    String? trackingStageKey,
    String? statusHeadline,
    String? paymentStateLabel,
    String? fulfillmentStateLabel,
    String? operatorLabel,
    String? phoneMasked,
    String? amountLabel,
    String? providerReferenceSuffix,
  }) async {
    final id = orderId.trim();
    if (id.isEmpty) return;
    final list = _readRaw();
    final now = DateTime.now().toUtc().toIso8601String();
    final idx = list.indexWhere(
      (e) => (e['orderId'] as String?)?.trim() == id,
    );
    final patch = <String, dynamic>{
      'orderId': id,
      'updatedAt': now,
      'checkoutSessionId': _trimOrNull(checkoutSessionId),
      'trackingStageKey': _trimOrNull(trackingStageKey),
      'statusHeadline': _trimOrNull(statusHeadline),
      'paymentStateLabel': _trimOrNull(paymentStateLabel),
      'fulfillmentStateLabel': _trimOrNull(fulfillmentStateLabel),
      'operatorLabel': _trimOrNull(operatorLabel),
      'phoneMasked': _trimOrNull(phoneMasked),
      'amountLabel': _trimOrNull(amountLabel),
      'providerReferenceSuffix': _trimOrNull(providerReferenceSuffix),
    };

    if (idx >= 0) {
      list[idx] = {...list[idx], ...patch};
    } else {
      list.insert(0, {'createdAt': now, ...patch});
    }
    while (list.length > _maxItems) {
      list.removeLast();
    }
    await _write(list);
  }

  List<Map<String, dynamic>> recentOrders() => _readRaw();
}
