import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/notifications/app_notification_hub.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/order_tracking_timeline.dart';
import '../../payments/domain/customer_order_tracking.dart';
import '../data/customer_orders_repository.dart';
import '../domain/order_center_row.dart';
import '../domain/order_sync_source.dart';
import 'order_center_copy.dart';
import 'order_receipt_widgets.dart';
import '../../support/presentation/order_assistance_widgets.dart';

class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({
    super.key,
    required this.orderId,
    this.initialRow,
  });

  final String orderId;
  final OrderCenterRow? initialRow;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  OrderCenterRow? _row;
  bool _loading = true;
  bool _fetchFailed = false;
  String? _lastNotifiedStage;

  CustomerOrdersRepository get _repo => CustomerOrdersRepository(
        api: AppScope.of(context).apiService,
        local: AppScope.of(context).orderHistory,
        auth: AppScope.authSessionOf(context),
      );

  @override
  void initState() {
    super.initState();
    _row = widget.initialRow;
    _lastNotifiedStage = widget.initialRow?.trackingStageKey;
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh(fromInit: true));
  }

  Future<void> _refresh({bool fromInit = false}) async {
    final auth = AppScope.authSessionOf(context);
    if (!auth.isAuthenticated) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _fetchFailed = _row == null;
      });
      return;
    }

    if (fromInit && _row == null) {
      setState(() => _loading = true);
    }

    try {
      final detail = await _repo.fetchAccountOrderDetail(widget.orderId);
      if (!mounted) return;
      if (detail != null) {
        await _repo.persistDetailSnapshot(detail);
      }
      final merged = detail ?? _row;
      final stageKey = merged?.trackingStageKey;
      if (stageKey != null &&
          stageKey != _lastNotifiedStage &&
          mounted) {
        final ph = orderPhaseFromTrackingKey(stageKey);
        if (ph != null) {
          _lastNotifiedStage = stageKey;
          await AppScope.of(context).notificationHub.publishOrderPhase(
                context,
                orderId: widget.orderId,
                phase: ph,
              );
        }
      }
      setState(() {
        _row = merged;
        _fetchFailed = detail == null && _row == null;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _row = _row ?? widget.initialRow;
        _fetchFailed = _row == null;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final auth = AppScope.authSessionOf(context);
    final row = _row;

    if (_loading && row == null) {
      return Scaffold(
        appBar: AppBar(
          title: Text(l10n.ordersDetailTitle),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => context.pop(),
          ),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (row == null) {
      return Scaffold(
        appBar: AppBar(
          title: Text(l10n.ordersDetailTitle),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => context.pop(),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.cloud_off_outlined,
                  size: 48,
                  color: t.colorScheme.outline,
                ),
                const SizedBox(height: 16),
                Text(
                  l10n.ordersCloudRefreshFailed,
                  textAlign: TextAlign.center,
                  style: t.textTheme.bodyLarge?.copyWith(height: 1.45),
                ),
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: _refresh,
                  icon: const Icon(Icons.refresh_rounded),
                  label: Text(l10n.actionRetry),
                ),
                const SizedBox(height: 12),
                TextButton.icon(
                  onPressed: () => context.push(AppRoutePaths.helpCenter),
                  icon: const Icon(Icons.menu_book_outlined),
                  label: Text(l10n.supportOpenHelpCenter),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final copy = OrderCenterCopy.forRow(row, l10n);
    final tracking = copy.$1;
    final paymentLabel =
        row.paymentStateLabel ??
        (tracking.stage == CustomerTrackingStage.paymentConfirming
            ? l10n.receiptPaymentPending
            : l10n.receiptPaymentPaid);
    final fulfillmentLabel =
        row.fulfillmentStateLabel ?? l10n.receiptFulfillmentProgress;

    final liveNote = auth.isAuthenticated && row.syncSource == OrderSyncSource.account
        ? l10n.ordersSectionLive
        : l10n.ordersSectionRecord;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.ordersDetailTitle),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            tooltip: l10n.supportOrderListHelpTooltip,
            icon: const Icon(Icons.help_outline_rounded),
            onPressed: () => context.push(AppRoutePaths.helpCenter),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _refresh(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20,12, 20, 32),
          children: [
            if (_fetchFailed && row.syncSource == OrderSyncSource.device)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Material(
                  color: t.colorScheme.secondaryContainer.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(16),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.info_outline_rounded,
                          color: t.colorScheme.onSecondaryContainer,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            l10n.ordersCloudRefreshFailed,
                            style: t.textTheme.bodySmall?.copyWith(height: 1.45),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            Text(
              liveNote,
              style: t.textTheme.labelLarge?.copyWith(
                color: t.colorScheme.outline,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              copy.$2,
              style: t.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              copy.$3,
              style: t.textTheme.bodyMedium?.copyWith(
                color: t.colorScheme.outline,
                height: 1.45,
              ),
            ),
            if (row.failureReason != null && row.failureReason!.trim().isNotEmpty) ...[
              const SizedBox(height: 14),
              Text(
                row.failureReason!,
                style: t.textTheme.bodySmall?.copyWith(height: 1.5),
              ),
            ],
            const SizedBox(height: 22),
            OrderTrackingTimeline(
              activeIndex: tracking.linearStepIndex,
              highlightStep: tracking.linearStepIndex,
              failedAtStep: tracking.stage == CustomerTrackingStage.failed,
            ),
            const SizedBox(height: 18),
            OrderTrustReceiptCard(l10n: l10n, row: row),
            const SizedBox(height: 18),
            OrderSituationAssistanceCard(l10n: l10n, tracking: tracking),
            if (tracking.paymentIsSafe &&
                tracking.stage != CustomerTrackingStage.orderCancelled) ...[
              const SizedBox(height: 20),
              OrderSafeCallout(l10n: l10n),
            ],
            const SizedBox(height: 18),
            OrderSupportActionBar(
              l10n: l10n,
              row: row,
              paymentLabel: paymentLabel,
              fulfillmentLabel: fulfillmentLabel,
            ),
            const SizedBox(height: 8),
            Text(
              l10n.ordersSectionRecord,
              style: t.textTheme.labelLarge?.copyWith(
                color: t.colorScheme.outline,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 12),
            OrderReceiptFields(
              l10n: l10n,
              orderId: row.orderId,
              paymentLabel: paymentLabel,
              fulfillmentLabel: fulfillmentLabel,
              operatorLabel: row.operatorLabel,
              phoneMasked: row.phoneMasked,
              amountLabel: row.amountLabel,
              refSuffix: row.providerReferenceSuffix,
              showCopyAction: true,
              onCopied: () {
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(l10n.ordersReferenceCopied), behavior: SnackBarBehavior.floating),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
