/// Customer-facing tracking (not raw API enums).
enum CustomerTrackingStage {
  paymentReceived,
  preparingTopup,
  sendingToOperator,
  /// Payment captured; operator outcome not yet proven — distinct from “sending” certainty.
  verifying,
  delivered,
  delayed,
  retrying,
  failed,
  /// Server indicates no further automatic recovery (distinct from transient failure).
  failedTerminally,
  paymentConfirming,
  orderCancelled,
}

/// Derived view model for timeline + copy (success / execute poll).
class CustomerOrderTracking {
  const CustomerOrderTracking({
    required this.stage,
    required this.linearStepIndex,
    required this.paymentIsSafe,
    required this.systemIsRetrying,
  });

  final CustomerTrackingStage stage;

  /// 0 = payment, 1 = prep, 2 = sending, 3 = delivered.
  final int linearStepIndex;

  final bool paymentIsSafe;
  final bool systemIsRetrying;

  static CustomerOrderTracking fromExecuteJson(Map<String, dynamic>? json) {
    final order = json?['order'] as Map<String, dynamic>?;
    final keyRaw =
        order?['lifecycleStageKey'] as String? ?? order?['trackingStageKey'] as String?;
    final key = keyRaw?.trim();
    if (key != null && key.isNotEmpty) {
      return fromServerTrackingStageKey(key);
    }

    final ful = json?['fulfillment'] as Map<String, dynamic>?;
    final orderStatus = (order?['orderStatus'] as String?)?.toUpperCase();
    final fStatus = (ful?['status'] as String?)?.toUpperCase();
    final err = (ful?['error'] as String?) ?? (order?['error'] as String?);

    if (orderStatus == 'FULFILLED' || fStatus == 'SUCCEEDED') {
      return const CustomerOrderTracking(
        stage: CustomerTrackingStage.delivered,
        linearStepIndex: 3,
        paymentIsSafe: true,
        systemIsRetrying: false,
      );
    }

    if (orderStatus == 'FAILED' || fStatus == 'FAILED') {
      return const CustomerOrderTracking(
        stage: CustomerTrackingStage.failed,
        linearStepIndex: 2,
        paymentIsSafe: true,
        systemIsRetrying: false,
      );
    }

    if (fStatus == 'RETRYING' || err?.toLowerCase().contains('retry') == true) {
      return const CustomerOrderTracking(
        stage: CustomerTrackingStage.retrying,
        linearStepIndex: 2,
        paymentIsSafe: true,
        systemIsRetrying: true,
      );
    }

    if (orderStatus == 'PROCESSING' ||
        fStatus == 'PROCESSING' ||
        fStatus == 'QUEUED') {
      final sending = fStatus == 'PROCESSING';
      return CustomerOrderTracking(
        stage:
            sending
                ? CustomerTrackingStage.sendingToOperator
                : CustomerTrackingStage.preparingTopup,
        linearStepIndex: sending ? 2 : 1,
        paymentIsSafe: true,
        systemIsRetrying: false,
      );
    }

    return const CustomerOrderTracking(
      stage: CustomerTrackingStage.preparingTopup,
      linearStepIndex: 1,
      paymentIsSafe: true,
      systemIsRetrying: false,
    );
  }

  static const CustomerOrderTracking paymentPending = CustomerOrderTracking(
    stage: CustomerTrackingStage.paymentConfirming,
    linearStepIndex: 0,
    paymentIsSafe: true,
    systemIsRetrying: false,
  );

  static const CustomerOrderTracking paymentReceived = CustomerOrderTracking(
    stage: CustomerTrackingStage.paymentReceived,
    linearStepIndex: 0,
    paymentIsSafe: true,
    systemIsRetrying: false,
  );

  static const CustomerOrderTracking unknownAfterPay = CustomerOrderTracking(
    stage: CustomerTrackingStage.delayed,
    linearStepIndex: 1,
    paymentIsSafe: true,
    systemIsRetrying: false,
  );

  static const CustomerOrderTracking signInToTrack = CustomerOrderTracking(
    stage: CustomerTrackingStage.delayed,
    linearStepIndex: 0,
    paymentIsSafe: true,
    systemIsRetrying: false,
  );

  /// `GET /api/orders/:id` body — uses `lifecycleStageKey` / `trackingStageKey`.
  static CustomerOrderTracking fromOrdersApiOrder(Map<String, dynamic> order) {
    final keyRaw = order['lifecycleStageKey'] as String? ??
        order['trackingStageKey'] as String?;
    if (keyRaw != null && keyRaw.trim().isNotEmpty) {
      return fromServerTrackingStageKey(keyRaw.trim());
    }
    return unknownAfterPay;
  }

  /// Maps server `trackingStageKey` to customer-safe timeline + copy.
  static CustomerOrderTracking fromServerTrackingStageKey(String? key) {
    switch (key) {
      case 'delivered':
        return const CustomerOrderTracking(
          stage: CustomerTrackingStage.delivered,
          linearStepIndex: 3,
          paymentIsSafe: true,
          systemIsRetrying: false,
        );
      case 'failed':
        return const CustomerOrderTracking(
          stage: CustomerTrackingStage.failed,
          linearStepIndex: 2,
          paymentIsSafe: true,
          systemIsRetrying: false,
        );
      case 'failed_terminally':
        return const CustomerOrderTracking(
          stage: CustomerTrackingStage.failedTerminally,
          linearStepIndex: 2,
          paymentIsSafe: true,
          systemIsRetrying: false,
        );
      case 'completed':
        return const CustomerOrderTracking(
          stage: CustomerTrackingStage.delivered,
          linearStepIndex: 3,
          paymentIsSafe: true,
          systemIsRetrying: false,
        );
      case 'delayed':
        return const CustomerOrderTracking(
          stage: CustomerTrackingStage.delayed,
          linearStepIndex: 2,
          paymentIsSafe: true,
          systemIsRetrying: false,
        );
      case 'requires_review':
        return const CustomerOrderTracking(
          stage: CustomerTrackingStage.verifying,
          linearStepIndex: 2,
          paymentIsSafe: true,
          systemIsRetrying: false,
        );
      case 'retrying':
        return const CustomerOrderTracking(
          stage: CustomerTrackingStage.retrying,
          linearStepIndex: 2,
          paymentIsSafe: true,
          systemIsRetrying: true,
        );
      case 'payment_pending':
        return paymentPending;
      case 'cancelled':
        return const CustomerOrderTracking(
          stage: CustomerTrackingStage.orderCancelled,
          linearStepIndex: 1,
          paymentIsSafe: true,
          systemIsRetrying: false,
        );
      case 'sending':
        return const CustomerOrderTracking(
          stage: CustomerTrackingStage.sendingToOperator,
          linearStepIndex: 2,
          paymentIsSafe: true,
          systemIsRetrying: false,
        );
      case 'verifying':
        return const CustomerOrderTracking(
          stage: CustomerTrackingStage.verifying,
          linearStepIndex: 2,
          paymentIsSafe: true,
          systemIsRetrying: false,
        );
      case 'preparing':
        return const CustomerOrderTracking(
          stage: CustomerTrackingStage.preparingTopup,
          linearStepIndex: 1,
          paymentIsSafe: true,
          systemIsRetrying: false,
        );
      default:
        return const CustomerOrderTracking(
          stage: CustomerTrackingStage.preparingTopup,
          linearStepIndex: 1,
          paymentIsSafe: true,
          systemIsRetrying: false,
        );
    }
  }
}
