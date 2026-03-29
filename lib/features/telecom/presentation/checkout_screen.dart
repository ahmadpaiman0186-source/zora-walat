import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../services/payment_service.dart';
import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/zw_primary_button.dart';
import '../../payments/domain/payment_result.dart';
import '../domain/telecom_order.dart';
import '../domain/telecom_service_line.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key, required this.order});

  final TelecomOrder order;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _logCheckoutOpened());
  }

  Future<void> _logCheckoutOpened() async {
    final log = AppScope.of(context).transactionLog;
    final o = widget.order;
    await log.append({
      'event': 'checkout_opened',
      'service': o.line.name,
      'operator': o.operator.apiKey,
      'product_id': o.productId,
      'amount_usd_cents': o.finalUsdCents,
      'phone_masked': o.metadata['phone_masked'] ?? '—',
    });
  }

  Future<void> _pay() async {
    setState(() => _busy = true);
    final log = AppScope.of(context).transactionLog;
    final service = AppScope.of(context).paymentService;
    await log.append({
      'event': 'payment_attempt',
      'product_id': widget.order.productId,
      'amount_usd_cents': widget.order.finalUsdCents,
    });
    final result = await service.pay(widget.order);
    if (!mounted) return;
    setState(() => _busy = false);

    final l10n = AppLocalizations.of(context);

    switch (result) {
      case PaymentSuccess s:
        await log.append({
          'event': 'payment_success',
          'product_id': widget.order.productId,
          'payment_intent': s.paymentIntentId ?? '—',
        });
        if (!mounted) return;
        await showDialog<void>(
          context: context,
          builder: (ctx) {
            final dlg = AppLocalizations.of(ctx);
            return AlertDialog(
              title: Text(dlg.paymentSuccessTitle),
              content: Text(dlg.paymentSuccessBody),
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    context.go(AppRoutePaths.home);
                  },
                  child: Text(dlg.done),
                ),
              ],
            );
          },
        );
      case PaymentFailure(:final message):
        await log.append({
          'event': 'payment_failure',
          'message': message,
        });
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: Colors.red.shade800),
        );
      case PaymentCancelled():
        await log.append({'event': 'payment_cancelled'});
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.paymentCancelled)),
        );
    }
  }

  String _lineLabel(AppLocalizations l10n) {
    switch (widget.order.line) {
      case TelecomServiceLine.airtime:
        return l10n.lineAirtime;
      case TelecomServiceLine.data:
        return l10n.lineDataPackage;
      case TelecomServiceLine.internationalPlaceholder:
        return l10n.lineInternational;
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final o = widget.order;
    final fmt = NumberFormat.currency(
      locale: Localizations.localeOf(context).toString(),
      symbol: r'$',
    );
    final usd = fmt.format(o.finalUsdCents / 100);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.reviewPayTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        children: [
          Text(l10n.orderSummary, style: t.textTheme.headlineSmall),
          const SizedBox(height: 20),
          _SummaryTile(label: l10n.serviceLabel, value: _lineLabel(l10n)),
          _SummaryTile(
            label: l10n.phoneNumberLabel,
            value: o.phone.display,
          ),
          _SummaryTile(
            label: l10n.operatorLabel,
            value: o.operator.displayName,
          ),
          _SummaryTile(
            label: l10n.packageLabel,
            value: o.productTitle,
          ),
          const Divider(height: 36),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(l10n.totalUsd, style: t.textTheme.titleMedium),
              Text(
                usd,
                style: t.textTheme.headlineSmall?.copyWith(
                  color: t.colorScheme.primary,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: t.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.stripeSectionTitle, style: t.textTheme.titleSmall),
                const SizedBox(height: 8),
                Text(
                  !PaymentClientConfig.isStripeConfigured
                      ? l10n.stripeKeyMissing
                      : l10n.stripeKeyLoaded,
                  style: t.textTheme.bodySmall?.copyWith(
                    color: t.colorScheme.outline,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          ZwPrimaryButton(
            label: _busy ? l10n.processing : l10n.payWithStripe,
            icon: Icons.credit_card_rounded,
            onPressed: _busy ? null : _pay,
          ),
        ],
      ),
    );
  }
}

class _SummaryTile extends StatelessWidget {
  const _SummaryTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
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
            child: Text(value, style: t.textTheme.titleMedium),
          ),
        ],
      ),
    );
  }
}
