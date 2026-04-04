import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/unauthorized_exception.dart';
import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';

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
  String? _deliveryLine;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeKickFulfillment());
  }

  Future<void> _maybeKickFulfillment() async {
    final oid = widget.orderReference?.trim();
    if (oid == null || oid.isEmpty) return;
    setState(() => _busy = true);
    try {
      final api = AppScope.of(context).apiService;
      final r = await api.postRechargeExecute(oid);
      if (!mounted) return;
      if (r.isOk) {
        final order = r.json['order'] as Map<String, dynamic>?;
        final ful = r.json['fulfillment'] as Map<String, dynamic>?;
        final orderStatus = order?['orderStatus'] as String?;
        final fStatus = ful?['status'] as String?;
        final ref = ful?['providerReference'] as String?;
        if (orderStatus == 'FULFILLED') {
          _deliveryLine = ref != null && ref.isNotEmpty
              ? 'Airtime sent. Reference: $ref'
              : 'Airtime delivery completed.';
        } else if (orderStatus == 'FAILED') {
          _deliveryLine =
              'Recharge could not be completed. Check your orders for details.';
        } else if (fStatus == 'SUCCEEDED') {
          _deliveryLine = ref != null && ref.isNotEmpty
              ? 'Airtime sent. Reference: $ref'
              : 'Airtime delivery completed.';
        } else if (orderStatus == 'PROCESSING' ||
            fStatus == 'PROCESSING' ||
            fStatus == 'QUEUED') {
          _deliveryLine = 'Delivery in progress…';
        } else {
          _deliveryLine = 'Order: ${orderStatus ?? '—'}';
        }
      } else if (r.isPaymentPending) {
        final err = r.json['error'] as String? ?? '';
        _deliveryLine = err.contains('not confirmed')
            ? 'Payment is still confirming. Delivery will start in a moment.'
            : err;
      }
    } on UnauthorizedException {
      if (!mounted) return;
      _deliveryLine =
          'Sign in to track recharge status in your orders.';
    } catch (_) {
      if (!mounted) return;
      _deliveryLine =
          'Could not refresh delivery status. Your payment is recorded; check orders shortly.';
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final cs = t.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment received'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 8),
              Align(
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: cs.primary.withValues(alpha: 0.12),
                    border: Border.all(
                      color: cs.primary.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Icon(
                    Icons.check_rounded,
                    size: 40,
                    color: cs.primary,
                  ),
                ),
              ),
              const SizedBox(height: 28),
              Text(
                'Stripe confirmed your payment',
                textAlign: TextAlign.center,
                style: t.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 28),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: cs.surfaceContainerHighest.withValues(alpha: 0.65),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: cs.outline.withValues(alpha: 0.25),
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Reference',
                        style: t.textTheme.labelLarge?.copyWith(
                          color: cs.onSurface.withValues(alpha: 0.7),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _primaryReference(),
                        style: t.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                          letterSpacing: 0.15,
                        ),
                      ),
                      if (_hasStripeSessionLine()) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Stripe session: ${_stripeSessionSnippet()}',
                          style: t.textTheme.bodySmall?.copyWith(
                            color: cs.onSurface.withValues(alpha: 0.65),
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      Text(
                        'Airtime or data delivery is processed on our servers after payment. Status below updates when available.',
                        style: t.textTheme.bodySmall?.copyWith(
                          color: cs.onSurface.withValues(alpha: 0.65),
                          height: 1.35,
                        ),
                      ),
                      if (_busy) ...[
                        const SizedBox(height: 12),
                        const LinearProgressIndicator(minHeight: 3),
                      ],
                      if (_deliveryLine != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _deliveryLine!,
                          style: t.textTheme.bodySmall?.copyWith(
                            color: cs.onSurface.withValues(alpha: 0.85),
                            height: 1.35,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const Spacer(),
              FilledButton(
                onPressed: () => context.go(AppRoutePaths.hub),
                child: const Text('Go Home'),
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

  bool _hasStripeSessionLine() {
    final o = widget.orderReference?.trim();
    final s = widget.checkoutSessionId?.trim();
    return o != null &&
        o.isNotEmpty &&
        s != null &&
        s.isNotEmpty;
  }

  String _stripeSessionSnippet() {
    final s = widget.checkoutSessionId!.trim();
    if (s.length <= 24) return s;
    return '${s.substring(0, 12)}…${s.substring(s.length - 8)}';
  }
}
