import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/unauthorized_exception.dart';
import '../../../core/di/app_scope.dart';
import '../../../core/notifications/app_notification_hub.dart';
import '../../../core/routing/app_router.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/order_tracking_timeline.dart';
import '../../../shared/widgets/trust_strip.dart';
import '../domain/customer_order_tracking.dart';
import 'tracking_messages.dart';

/// Shown after Stripe Checkout when the app opens at `/success`.
///
/// Optional [checkoutSessionId] comes from Stripe `session_id` on the return URL.
/// Optional [orderReference] is the server order id from `order_id` (set by checkout success_url).
class SuccessScreen extends StatefulWidget {
  const SuccessScreen({
    super.key,
    this.checkoutSessionId,
    this.orderReference,
  });

  final String? checkoutSessionId;
  final String? orderReference;

  @override
  State<SuccessScreen> createState() => _SuccessScreenState();
}

class _SuccessScreenState extends State<SuccessScreen> {
  CustomerOrderTracking? _tracking;
  String? _providerRefTail;
  bool _busy = false;
  OrderNotificationPhase? _lastOrderNotif;
  /// Set when post-checkout bootstrap throws — UI still renders (never a blank screen).
  String? _bootstrapError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        await _seedLocalHistory();
        await _maybeKickFulfillment();
      } catch (e, st) {
        assert(() {
          FlutterError.dumpErrorToConsole(
            FlutterErrorDetails(exception: e, stack: st),
          );
          return true;
        }());
        if (!mounted) return;
        setState(() {
          _bootstrapError = e.toString();
          _tracking ??= CustomerOrderTracking.paymentReceived;
          _busy = false;
        });
      }
    });
  }

  Future<void> _seedLocalHistory() async {
    final oid = widget.orderReference?.trim();
    if (oid == null || oid.isEmpty) return;
    final l10n = AppLocalizations.of(context);
    await AppScope.of(context).orderHistory.upsertOrder(
          orderId: oid,
          checkoutSessionId: widget.checkoutSessionId,
          trackingStageKey: 'payment_pending',
          statusHeadline: l10n.trackingHeadlinePaymentReceived,
          paymentStateLabel: l10n.receiptPaymentPaid,
          fulfillmentStateLabel: l10n.receiptFulfillmentProgress,
        );
    if (!mounted) return;
    final hub = AppScope.of(context).notificationHub;
    await hub.publishOrderPhase(
      context,
      orderId: oid,
      phase: OrderNotificationPhase.paymentSecured,
    );
    _lastOrderNotif = OrderNotificationPhase.paymentSecured;
  }

  Future<void> _maybeKickFulfillment() async {
    final oid = widget.orderReference?.trim();
    if (oid == null || oid.isEmpty) {
      if (!mounted) return;
      setState(() {
        _tracking = CustomerOrderTracking.paymentReceived;
      });
      return;
    }
    setState(() => _busy = true);
    CustomerOrderTracking tracking = CustomerOrderTracking.paymentReceived;
    String? refTail;
    try {
      final api = AppScope.of(context).apiService;
      final r = await api.postRechargeExecute(oid);
      if (!mounted) return;
      if (r.isOk) {
        final ful = r.json['fulfillment'] as Map<String, dynamic>?;
        final ref = ful?['providerReference'] as String?;
        if (ref != null && ref.length > 6) {
          refTail = ref.length <= 14 ? ref : '…${ref.substring(ref.length - 10)}';
        }
        tracking = CustomerOrderTracking.fromExecuteJson(r.json);
      } else if (r.isPaymentPending) {
        final orderMap = r.json['order'];
        if (orderMap is Map<String, dynamic>) {
          tracking = CustomerOrderTracking.fromExecuteJson(r.json);
        } else {
          final err = r.json['error'] as String? ?? '';
          tracking = err.toLowerCase().contains('not confirmed')
              ? CustomerOrderTracking.paymentPending
              : CustomerOrderTracking.paymentReceived;
        }
      } else {
        tracking = CustomerOrderTracking.unknownAfterPay;
      }

      await _persistOrderSnapshot(
        orderId: oid,
        tracking: tracking,
        refTail: refTail,
      );
      if (!mounted) return;
      final ph = orderPhaseFromCustomerTracking(tracking);
      if (ph != null && ph != _lastOrderNotif) {
        _lastOrderNotif = ph;
        await AppScope.of(context).notificationHub.publishOrderPhase(
              context,
              orderId: oid,
              phase: ph,
            );
      }
      setState(() {
        _tracking = tracking;
        _providerRefTail = refTail;
      });
    } on UnauthorizedException {
      if (!mounted) return;
      final l10n = AppLocalizations.of(context);
      await AppScope.of(context).orderHistory.upsertOrder(
            orderId: oid,
            trackingStageKey: 'in_progress',
            statusHeadline: l10n.trackingHeadlineSignIn,
            paymentStateLabel: l10n.receiptPaymentPaid,
            fulfillmentStateLabel: l10n.receiptFulfillmentProgress,
          );
      setState(() => _tracking = CustomerOrderTracking.signInToTrack);
    } catch (_) {
      if (!mounted) return;
      tracking = CustomerOrderTracking.unknownAfterPay;
      await _persistOrderSnapshot(orderId: oid, tracking: tracking);
      setState(() => _tracking = tracking);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _persistOrderSnapshot({
    required String orderId,
    required CustomerOrderTracking tracking,
    String? refTail,
  }) async {
    final l10n = AppLocalizations.of(context);
    final headline = TrackingMessages.forTracking(l10n, tracking).$1;
    await AppScope.of(context).orderHistory.upsertOrder(
          orderId: orderId,
          checkoutSessionId: widget.checkoutSessionId,
          trackingStageKey: _storageKeyFor(tracking.stage),
          statusHeadline: headline,
          paymentStateLabel: _paymentLabel(l10n, tracking),
          fulfillmentStateLabel: _fulfillmentLabel(l10n, tracking),
          providerReferenceSuffix: refTail,
        );
  }

  /// Hero icon: payment secured vs full delivery — avoid a global “verified” checkmark while still verifying.
  static IconData _heroIconForPaymentStage(CustomerTrackingStage s) {
    switch (s) {
      case CustomerTrackingStage.delivered:
        return Icons.verified_rounded;
      case CustomerTrackingStage.verifying:
      case CustomerTrackingStage.retrying:
        return Icons.hourglass_top_rounded;
      case CustomerTrackingStage.failed:
      case CustomerTrackingStage.failedTerminally:
        return Icons.support_agent_rounded;
      case CustomerTrackingStage.orderCancelled:
        return Icons.cancel_outlined;
      default:
        return Icons.payments_rounded;
    }
  }

  static String _storageKeyFor(CustomerTrackingStage s) {
    switch (s) {
      case CustomerTrackingStage.delivered:
        return 'delivered';
      case CustomerTrackingStage.failed:
      case CustomerTrackingStage.failedTerminally:
        return 'failed';
      case CustomerTrackingStage.retrying:
        return 'retrying';
      case CustomerTrackingStage.paymentConfirming:
        return 'payment_pending';
      case CustomerTrackingStage.verifying:
        return 'verifying';
      default:
        return 'in_progress';
    }
  }

  static String _paymentLabel(
    AppLocalizations l10n,
    CustomerOrderTracking t,
  ) {
    if (t.stage == CustomerTrackingStage.paymentConfirming) {
      return l10n.receiptPaymentPending;
    }
    return l10n.receiptPaymentPaid;
  }

  static String _fulfillmentLabel(
    AppLocalizations l10n,
    CustomerOrderTracking t,
  ) {
    switch (t.stage) {
      case CustomerTrackingStage.delivered:
        return l10n.receiptFulfillmentDone;
      case CustomerTrackingStage.failed:
      case CustomerTrackingStage.failedTerminally:
        return l10n.orderStatusFailed;
      case CustomerTrackingStage.retrying:
        return l10n.orderStatusRetrying;
      case CustomerTrackingStage.orderCancelled:
        return l10n.orderStatusCancelled;
      case CustomerTrackingStage.verifying:
        return l10n.orderStatusVerifying;
      case CustomerTrackingStage.paymentConfirming:
      case CustomerTrackingStage.paymentReceived:
        return l10n.receiptFulfillmentProgress;
      default:
        return l10n.receiptFulfillmentProgress;
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final cs = t.colorScheme;
    final hasIds =
        (widget.checkoutSessionId?.trim().isNotEmpty ?? false) ||
            (widget.orderReference?.trim().isNotEmpty ?? false);
    final tracking = _tracking ?? CustomerOrderTracking.paymentReceived;
    final copy = TrackingMessages.forTracking(l10n, tracking);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.successScreenTitle),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!hasIds)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Material(
                    color: cs.errorContainer.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(
                        l10n.successMissingReturnParamsHint,
                        style: t.textTheme.bodySmall?.copyWith(height: 1.4),
                      ),
                    ),
                  ),
                ),
              if (_bootstrapError != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Material(
                    color: cs.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(
                        l10n.successBootstrapWarning(
                          _bootstrapError!.length > 280
                              ? '${_bootstrapError!.substring(0, 280)}…'
                              : _bootstrapError!,
                        ),
                        style: t.textTheme.bodySmall?.copyWith(height: 1.35),
                      ),
                    ),
                  ),
                ),
              Align(
                child: Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: cs.primary.withValues(alpha: 0.12),
                    border: Border.all(
                      color: cs.primary.withValues(alpha: 0.4),
                    ),
                  ),
                  child: Icon(
                    _heroIconForPaymentStage(tracking.stage),
                    size: 44,
                    color: cs.primary,
                  ),
                ),
              ),
              const SizedBox(height: 22),
              Text(
                l10n.successPaymentConfirmed,
                textAlign: TextAlign.center,
                style: t.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                l10n.successStripeConfirmedShort,
                textAlign: TextAlign.center,
                style: t.textTheme.bodyMedium?.copyWith(
                  color: cs.outline,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 22),
              TrustStrip(compact: true),
              const SizedBox(height: 24),
              if (_busy) const LinearProgressIndicator(minHeight: 3),
              if (_busy) const SizedBox(height: 16),
              Text(
                copy.$1,
                style: t.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                copy.$2,
                style: t.textTheme.bodyMedium?.copyWith(
                  color: cs.outline,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 22),
              OrderTrackingTimeline(
                activeIndex: tracking.linearStepIndex,
                highlightStep: tracking.linearStepIndex,
                failedAtStep:
                    tracking.stage == CustomerTrackingStage.failed ||
                    tracking.stage == CustomerTrackingStage.failedTerminally,
              ),
              const SizedBox(height: 22),
              _SafeBanner(l10n: l10n),
              const SizedBox(height: 20),
              Text(
                l10n.receiptTitle,
                style: t.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(height: 12),
              _ReceiptCard(
                l10n: l10n,
                orderRef: _primaryReference(),
                sessionSnippet: _stripeSessionSnippet(),
                paymentLabel: _paymentLabel(l10n, tracking),
                fulfillmentLabel: _fulfillmentLabel(l10n, tracking),
                providerRef: _providerRefTail,
              ),
              const SizedBox(height: 20),
              Text(
                l10n.receiptWhatNextTitle,
                style: t.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _whatNextBody(l10n, tracking),
                style: t.textTheme.bodyMedium?.copyWith(
                  color: cs.outline,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 28),
              FilledButton(
                onPressed: () => context.push(AppRoutePaths.orders),
                child: Text(l10n.successViewOrders),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => context.go(AppRoutePaths.hub),
                child: Text(l10n.successBackHome),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _primaryReference() {
    final o = widget.orderReference?.trim();
    if (o != null && o.isNotEmpty) return o;
    final s = widget.checkoutSessionId?.trim();
    if (s != null && s.isNotEmpty) return s;
    return '—';
  }

  String? _stripeSessionSnippet() {
    final s = widget.checkoutSessionId?.trim();
    if (s == null || s.isEmpty) return null;
    if (s.length <= 24) return s;
    return '${s.substring(0, 10)}…${s.substring(s.length - 8)}';
  }

  /// “What next” must track fulfillment state, not only payment — avoids generic copy while top-up is pending.
  static String _whatNextBody(
    AppLocalizations l10n,
    CustomerOrderTracking tracking,
  ) {
    switch (tracking.stage) {
      case CustomerTrackingStage.verifying:
        return l10n.trackingBodyVerifying;
      case CustomerTrackingStage.retrying:
        return l10n.trackingBodyRetrying;
      case CustomerTrackingStage.paymentReceived:
        return l10n.trackingBodyPaymentReceived;
      case CustomerTrackingStage.delayed:
        return l10n.trackingBodyCatchingUp;
      case CustomerTrackingStage.failed:
      case CustomerTrackingStage.failedTerminally:
        return l10n.trackingBodyFailedCalm;
      case CustomerTrackingStage.orderCancelled:
        return l10n.trackingBodyCancelled;
      case CustomerTrackingStage.preparingTopup:
      case CustomerTrackingStage.sendingToOperator:
        return l10n.receiptWhatNextBody;
      case CustomerTrackingStage.delivered:
        return l10n.trackingBodyDelivered;
      case CustomerTrackingStage.paymentConfirming:
        return l10n.trackingBodyPaymentConfirming;
    }
  }
}

class _SafeBanner extends StatelessWidget {
  const _SafeBanner({required this.l10n});

  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: t.colorScheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: t.colorScheme.primary.withValues(alpha: 0.28),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.gpp_good_outlined, color: t.colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              l10n.paymentSafeBanner,
              style: t.textTheme.bodySmall?.copyWith(height: 1.45),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReceiptCard extends StatelessWidget {
  const _ReceiptCard({
    required this.l10n,
    required this.orderRef,
    required this.paymentLabel,
    required this.fulfillmentLabel,
    this.sessionSnippet,
    this.providerRef,
  });

  final AppLocalizations l10n;
  final String orderRef;
  final String paymentLabel;
  final String fulfillmentLabel;
  final String? sessionSnippet;
  final String? providerRef;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: t.colorScheme.surfaceContainerHighest.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: t.colorScheme.outline.withValues(alpha: 0.18),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.receiptOrderRef,
            style: t.textTheme.labelLarge?.copyWith(
              color: t.colorScheme.outline,
            ),
          ),
          const SizedBox(height: 6),
          SelectableText(
            orderRef,
            style: t.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0.2,
            ),
          ),
          if (sessionSnippet != null) ...[
            const SizedBox(height: 10),
            Text(
              '${l10n.stripeSectionTitle} · $sessionSnippet',
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.outline,
              ),
            ),
          ],
          const SizedBox(height: 16),
          _Row(l10n.receiptPaymentStatus, paymentLabel, t),
          _Row(l10n.receiptFulfillmentStatus, fulfillmentLabel, t),
          if (providerRef != null && providerRef!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              '${l10n.receiptCarrierRef}: $providerRef',
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.outline,
                height: 1.35,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value, this.t);

  final String label;
  final String value;
  final ThemeData t;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.outline,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: t.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
