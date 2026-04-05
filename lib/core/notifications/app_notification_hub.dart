import 'package:flutter/widgets.dart';

import '../../features/payments/domain/customer_order_tracking.dart';
import '../../l10n/app_localizations.dart';
import 'in_app_notification_store.dart';
import 'local_notification_service.dart';
import 'notification_payload.dart';

/// Order lifecycle phases surfaced to customers (calm copy via l10n).
enum OrderNotificationPhase {
  paymentSecured,
  preparing,
  sendingToOperator,
  delivered,
  retrying,
  failedCalm,
}

class AppNotificationHub {
  AppNotificationHub({
    required InAppNotificationStore store,
  }) : _store = store;

  final InAppNotificationStore _store;
  int _idSeq = 1000;

  Future<void> publishOrderPhase(
    BuildContext context, {
    required String orderId,
    required OrderNotificationPhase phase,
  }) async {
    final l10n = AppLocalizations.of(context);
    final (title, body) = _orderCopy(l10n, phase);
    final payload = encodeOrderPayload(orderId);
    final dk = _serverAlignedDedupe(orderId, phase);
    final already = dk != null && _store.hasDedupeKey(dk);
    await _store.prepend(
      category: 'order',
      title: title,
      body: body,
      payload: payload,
      dedupeKey: dk,
    );
    if (already) {
      return;
    }
    final id = _nextId();
    await LocalNotificationService.instance.show(
      id: id,
      title: title,
      body: body,
      payload: payload,
    );
  }

  Future<void> publishLoyalty({
    required String title,
    required String body,
    int tab = 0,
  }) async {
    final payload = encodeLoyaltyPayload(tab: tab);
    await _store.prepend(
      category: 'loyalty',
      title: title,
      body: body,
      payload: payload,
    );
    await LocalNotificationService.instance.show(
      id: _nextId(),
      title: title,
      body: body,
      payload: payload,
    );
  }

  Future<void> publishInboxOnly(
    BuildContext context, {
    required String category,
    required String title,
    required String body,
    String? payload,
  }) async {
    await _store.prepend(
      category: category,
      title: title,
      body: body,
      payload: payload ?? encodeInboxPayload(),
    );
  }

  /// Server / FCM path: one inbox row + optional local notification (foreground).
  Future<void> ingestRemote({
    required String title,
    required String body,
    required String category,
    String? payload,
    String? dedupeKey,
    String? serverId,
    int? serverRevision,
    bool showLocal = false,
  }) async {
    if ((dedupeKey != null && _store.hasDedupeKey(dedupeKey)) ||
        (serverId != null && _store.hasServerId(serverId))) {
      return;
    }
    await _store.prepend(
      category: category,
      title: title,
      body: body,
      payload: payload,
      dedupeKey: dedupeKey,
      serverId: serverId,
      serverRevision: serverRevision,
    );
    if (showLocal) {
      await LocalNotificationService.instance.show(
        id: _nextId(),
        title: title,
        body: body,
        payload: payload,
      );
    }
  }

  int _nextId() {
    _idSeq = (_idSeq + 1) & 0x7fffffff;
    return _idSeq;
  }

  /// Matches server `userNotificationPipeline` dedupe keys where overlapping.
  String? _serverAlignedDedupe(String orderId, OrderNotificationPhase phase) {
    switch (phase) {
      case OrderNotificationPhase.paymentSecured:
        return 'order:$orderId:payment_success';
      case OrderNotificationPhase.delivered:
        return 'order:$orderId:delivered';
      case OrderNotificationPhase.failedCalm:
        return 'order:$orderId:failed';
      case OrderNotificationPhase.retrying:
        return 'order:$orderId:retrying';
      case OrderNotificationPhase.preparing:
      case OrderNotificationPhase.sendingToOperator:
        return null;
    }
  }

  (String, String) _orderCopy(AppLocalizations l10n, OrderNotificationPhase p) {
    switch (p) {
      case OrderNotificationPhase.paymentSecured:
        return (l10n.notifOrderPaymentTitle, l10n.notifOrderPaymentBody);
      case OrderNotificationPhase.preparing:
        return (l10n.notifOrderPreparingTitle, l10n.notifOrderPreparingBody);
      case OrderNotificationPhase.sendingToOperator:
        return (
          l10n.notifOrderSendingTitle,
          l10n.notifOrderSendingBody,
        );
      case OrderNotificationPhase.delivered:
        return (l10n.notifOrderDeliveredTitle, l10n.notifOrderDeliveredBody);
      case OrderNotificationPhase.retrying:
        return (l10n.notifOrderRetryingTitle, l10n.notifOrderRetryingBody);
      case OrderNotificationPhase.failedCalm:
        return (l10n.notifOrderFailedTitle, l10n.notifOrderFailedBody);
    }
  }
}

OrderNotificationPhase? orderPhaseFromCustomerTracking(CustomerOrderTracking t) {
  switch (t.stage) {
    case CustomerTrackingStage.delivered:
      return OrderNotificationPhase.delivered;
    case CustomerTrackingStage.failed:
      return OrderNotificationPhase.failedCalm;
    case CustomerTrackingStage.retrying:
      return OrderNotificationPhase.retrying;
    case CustomerTrackingStage.sendingToOperator:
      return OrderNotificationPhase.sendingToOperator;
    case CustomerTrackingStage.verifying:
      return OrderNotificationPhase.preparing;
    case CustomerTrackingStage.preparingTopup:
      return OrderNotificationPhase.preparing;
    case CustomerTrackingStage.paymentReceived:
      return OrderNotificationPhase.preparing;
    case CustomerTrackingStage.paymentConfirming:
      return OrderNotificationPhase.paymentSecured;
    case CustomerTrackingStage.delayed:
      return OrderNotificationPhase.preparing;
    case CustomerTrackingStage.orderCancelled:
      return null;
  }
}

OrderNotificationPhase? orderPhaseFromTrackingKey(String? key) {
  switch (key) {
    case 'payment_pending':
      return OrderNotificationPhase.paymentSecured;
    case 'preparing':
      return OrderNotificationPhase.preparing;
    case 'sending':
      return OrderNotificationPhase.sendingToOperator;
    case 'verifying':
      return OrderNotificationPhase.preparing;
    case 'delivered':
      return OrderNotificationPhase.delivered;
    case 'retrying':
      return OrderNotificationPhase.retrying;
    case 'failed':
      return OrderNotificationPhase.failedCalm;
    default:
      return null;
  }
}
