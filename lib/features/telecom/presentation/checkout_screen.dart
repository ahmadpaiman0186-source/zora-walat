import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/auth/unauthorized_exception.dart';
import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/utils/afghan_phone_utils.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/zw_primary_button.dart';
import '../../../stripe_keys.dart';
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
    if (_busy) return;
    setState(() => _busy = true);
    final router = GoRouter.of(context);
    final paymentService = AppScope.of(context).paymentService;
    final log = AppScope.of(context).transactionLog;
    await log.append({
      'event': 'payment_attempt',
      'product_id': widget.order.productId,
      'amount_usd_cents': widget.order.finalUsdCents,
    });
    try {
      await paymentService.startCheckout(
        amountUsdCents: widget.order.finalUsdCents,
        currency: 'usd',
        operatorKey: widget.order.operator.apiKey,
        recipientPhone: widget.order.phone.raw,
        packageId: widget.order.productId,
      );
      await log.append({
        'event': 'payment_checkout_redirect',
        'product_id': widget.order.productId,
      });
    } on UnauthorizedException catch (_) {
      await log.append({
        'event': 'payment_failure',
        'message': 'unauthorized',
      });
      if (!mounted) return;
      final l10n = AppLocalizations.of(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.authRequiredMessage)),
      );
      router.push(AppRoutePaths.signIn);
    } catch (e) {
      await log.append({
        'event': 'payment_failure',
        'message': '$e',
      });
      if (!mounted) return;
      final l10n = AppLocalizations.of(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            kReleaseMode ? l10n.authGenericError : '$e',
          ),
          backgroundColor: Colors.red.shade800,
        ),
      );
    }
    if (!mounted) return;
    setState(() => _busy = false);
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
    final phonePretty =
        AfghanPhoneUtils.displayInternational(o.phone.raw);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.reviewPayTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        children: [
          Text(
            l10n.checkoutYourOrder,
            style: t.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            l10n.currencyUsdHint,
            style: t.textTheme.bodySmall?.copyWith(
              color: t.colorScheme.outline,
            ),
          ),
          const SizedBox(height: 20),
          Card(
            margin: EdgeInsets.zero,
            color: t.colorScheme.surfaceContainerHighest,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(
                color: t.colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 20, 18, 8),
              child: Column(
                children: [
                  _DetailRow(
                    icon: Icons.category_rounded,
                    label: l10n.serviceLabel,
                    value: _lineLabel(l10n),
                  ),
                  _DetailRow(
                    icon: Icons.phone_android_rounded,
                    label: l10n.phoneNumberLabel,
                    value: phonePretty,
                  ),
                  _DetailRow(
                    icon: Icons.signal_cellular_alt_rounded,
                    label: l10n.operatorLabel,
                    value: o.operator.displayName,
                  ),
                  _DetailRow(
                    icon: Icons.shopping_bag_outlined,
                    label: l10n.packageLabel,
                    value: o.productTitle,
                    multiline: true,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              gradient: LinearGradient(
                colors: [
                  t.colorScheme.primary.withValues(alpha: 0.22),
                  t.colorScheme.primary.withValues(alpha: 0.08),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(
                color: t.colorScheme.primary.withValues(alpha: 0.35),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  l10n.totalUsd,
                  style: t.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  usd,
                  style: t.textTheme.headlineSmall?.copyWith(
                    color: t.colorScheme.primary,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: t.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: t.colorScheme.outline.withValues(alpha: 0.15),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.lock_rounded,
                      size: 20,
                      color: t.colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      l10n.stripeSectionTitle,
                      style: t.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  StripeKeys.publishableKey.trim().isEmpty
                      ? l10n.stripeKeyMissing
                      : l10n.checkoutPaymentSecureNote,
                  style: t.textTheme.bodySmall?.copyWith(
                    color: t.colorScheme.outline,
                    height: 1.45,
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

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    this.multiline = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool multiline;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment:
            multiline ? CrossAxisAlignment.start : CrossAxisAlignment.center,
        children: [
          Icon(icon, size: 22, color: t.colorScheme.primary.withValues(alpha: 0.9)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: t.textTheme.labelMedium?.copyWith(
                    color: t.colorScheme.outline,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: t.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    height: multiline ? 1.35 : 1.2,
                  ),
                  textAlign: TextAlign.start,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
