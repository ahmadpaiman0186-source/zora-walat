import 'dart:convert';

/// Deep-link payload for OS notifications and inbox rows (server-sync-ready shape).
abstract final class NotificationPayloadKeys {
  static const kind = 'k';
  static const orderId = 'id';
  static const loyaltyTab = 'tab';
  static const inboxOnly = 'inbox';
}

String? payloadToLocation(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  try {
    final m = jsonDecode(raw) as Map<String, dynamic>;
    final k = m[NotificationPayloadKeys.kind] as String?;
    switch (k) {
      case 'order':
        final id = m[NotificationPayloadKeys.orderId] as String?;
        if (id == null || id.isEmpty) return null;
        return '/orders/${Uri.encodeComponent(id)}';
      case 'loyalty':
        final tab = m[NotificationPayloadKeys.loyaltyTab] as int? ?? 0;
        final t = tab.clamp(0, 1);
        return '/loyalty?tab=$t';
      case 'inbox':
        return '/notifications';
      default:
        return null;
    }
  } catch (_) {
    return null;
  }
}

String encodeOrderPayload(String orderId) {
  return jsonEncode({
    NotificationPayloadKeys.kind: 'order',
    NotificationPayloadKeys.orderId: orderId,
  });
}

String encodeLoyaltyPayload({int tab = 0}) {
  return jsonEncode({
    NotificationPayloadKeys.kind: 'loyalty',
    NotificationPayloadKeys.loyaltyTab: tab.clamp(0, 1),
  });
}

String encodeInboxPayload() {
  return jsonEncode({NotificationPayloadKeys.kind: 'inbox'});
}
