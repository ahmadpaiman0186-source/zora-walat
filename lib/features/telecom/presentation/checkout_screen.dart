import 'dart:async' show unawaited;

import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/auth/email_verification_required_exception.dart';
import '../../../core/auth/unauthorized_exception.dart';
import '../../../models/checkout_pricing_breakdown.dart';
import '../../../models/checkout_pricing_quote_response.dart';
import '../../../core/business/sender_country.dart';
import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/utils/afghan_phone_utils.dart';
import '../../../l10n/app_localizations.dart';
import '../../../services/checkout_errors.dart';
import '../../../shared/widgets/trust_strip.dart';
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
  bool _quoteBusy = false;
  /// True after quote request completes without a breakdown (or on exception).
  bool _quoteFailed = false;
  CheckoutPricingQuoteResponse? _quote;
  CheckoutPricingBreakdown? get _breakdown => _quote?.breakdown;
  late String _senderCountry;
  /// Increments on each quote request so out-of-order completions are ignored.
  int _quoteSeq = 0;

  @override
  void initState() {
    super.initState();
    _senderCountry = inferSenderCountryCodeFromLocale(
      WidgetsBinding.instance.platformDispatcher.locale.countryCode,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _logCheckoutOpened();
      unawaited(_loadPricingQuote());
    });
  }

  Future<void> _loadPricingQuote() async {
    if (widget.order.line != TelecomServiceLine.airtime) return;
    if (!mounted) return;
    final seq = ++_quoteSeq;
    setState(() {
      _quoteBusy = true;
      _quoteFailed = false;
    });
    final paymentService = AppScope.of(context).paymentService;
    try {
      final q = await paymentService.fetchCheckoutPricingQuote(
        amountCents: widget.order.finalUsdCents,
        senderCountry: _senderCountry,
        operatorKey: widget.order.operator.apiKey,
        recipientPhone: widget.order.phone.raw,
        packageId: widget.order.productId,
      );
      if (!mounted || seq != _quoteSeq) return;
      setState(() {
        _quote = q;
        _quoteBusy = false;
        _quoteFailed = q == null || q.breakdown == null;
      });
    } catch (_) {
      if (!mounted || seq != _quoteSeq) return;
      setState(() {
        _quoteBusy = false;
        _quoteFailed = true;
      });
    }
  }

  void _logCheckoutOpened() {
    final log = AppScope.of(context).transactionLog;
    final o = widget.order;
    unawaited(
      log
          .append({
            'event': 'checkout_opened',
            'service': o.line.name,
            'operator': o.operator.apiKey,
            'product_id': o.productId,
            'amount_cents': o.finalUsdCents,
            'phone_masked': o.metadata['phone_masked'] ?? '—',
          })
          .catchError((_) {}),
    );
  }

  Future<void> _pay() async {
    if (_busy) return;
    if (widget.order.line != TelecomServiceLine.airtime) {
      if (!mounted) return;
      final l10n = AppLocalizations.of(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.phase1OnlyAirtimeSnack)),
      );
      return;
    }
    setState(() => _busy = true);
    final router = GoRouter.of(context);
    final paymentService = AppScope.of(context).paymentService;
    final log = AppScope.of(context).transactionLog;
    unawaited(
      log
          .append({
            'event': 'payment_attempt',
            'product_id': widget.order.productId,
            'amount_cents': widget.order.finalUsdCents,
          })
          .catchError((_) {}),
    );
    try {
      final sessionBreakdown = await paymentService.startCheckout(
        amountCents: widget.order.finalUsdCents,
        senderCountry: _senderCountry,
        currency: 'usd',
        operatorKey: widget.order.operator.apiKey,
        recipientPhone: widget.order.phone.raw,
        packageId: widget.order.productId,
      );
      if (mounted && sessionBreakdown != null) {
        setState(
          () => _quote = CheckoutPricingQuoteResponse(
            breakdown: sessionBreakdown,
            pricingMeta: _quote?.pricingMeta,
          ),
        );
      }
      unawaited(
        log
            .append({
              'event': 'payment_checkout_redirect',
              'product_id': widget.order.productId,
            })
            .catchError((_) {}),
      );
    } on PaymentsLockdownException catch (e) {
      unawaited(
        log
            .append({
              'event': 'payment_failure',
              'message': 'payments_lockdown',
            })
            .catchError((_) {}),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message),
          backgroundColor: Colors.orange.shade900,
        ),
      );
    } on UnauthorizedException catch (_) {
      unawaited(
        log
            .append({
              'event': 'payment_failure',
              'message': 'unauthorized',
            })
            .catchError((_) {}),
      );
      if (!mounted) return;
      final l10n = AppLocalizations.of(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.authRequiredMessage)),
      );
      router.push(AppRoutePaths.signIn);
    } on EmailVerificationRequiredException catch (e) {
      unawaited(
        log
            .append({
              'event': 'payment_failure',
              'message': 'email_verification_required',
            })
            .catchError((_) {}),
      );
      if (!mounted) return;
      final email = AppScope.authSessionOf(context).userEmail ?? '';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
      if (email.isNotEmpty) {
        router.push(
          '${AppRoutePaths.signInOtp}?email=${Uri.encodeComponent(email)}',
        );
      }
    } catch (e) {
      unawaited(
        log
            .append({
              'event': 'payment_failure',
              'message': '$e',
            })
            .catchError((_) {}),
      );
      if (!mounted) return;
      final l10n = AppLocalizations.of(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            kReleaseMode
                ? (e is StateError
                    ? (e.message as String? ?? l10n.authGenericError)
                    : l10n.authGenericError)
                : '$e',
          ),
          backgroundColor: Colors.red.shade800,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
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
    final phonePretty =
        AfghanPhoneUtils.displayInternational(o.phone.raw);

    final stripeKeyMissing = StripeKeys.publishableKey.trim().isEmpty;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.reviewPayTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
        children: [
          if (stripeKeyMissing)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Material(
                color: t.colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(14),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.warning_amber_rounded,
                        color: t.colorScheme.onErrorContainer,
                        size: 28,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l10n.stripeKeyMissing,
                              style: t.textTheme.titleSmall?.copyWith(
                                color: t.colorScheme.onErrorContainer,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              l10n.aboutDevHint,
                              style: t.textTheme.bodySmall?.copyWith(
                                color: t.colorScheme.onErrorContainer,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          Text(
            l10n.checkoutYourOrder,
            style: t.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            l10n.checkoutScreenCurrencyHint,
            style: t.textTheme.bodySmall?.copyWith(
              color: t.colorScheme.outline,
            ),
          ),
          if (widget.order.line == TelecomServiceLine.airtime) ...[
            const SizedBox(height: 8),
            if (_breakdown != null) ...[
              Text(
                l10n.checkoutReviewTotalChargedHeadline(
                  fmt.format(_breakdown!.totalUsd),
                ),
                style: t.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                l10n.checkoutReviewAirtimeValueSubline(
                  fmt.format(_breakdown!.productValueUsd),
                ),
                style: t.textTheme.bodyMedium?.copyWith(
                  color: t.colorScheme.outline,
                  height: 1.35,
                ),
              ),
            ] else if (_quoteBusy) ...[
              Text(
                l10n.checkoutPricingLoading,
                style: t.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: t.colorScheme.outline,
                ),
              ),
            ] else ...[
              Text(
                _quoteFailed
                    ? l10n.checkoutQuoteFailed
                    : l10n.checkoutReviewHeadlinePricingUnavailable,
                style: t.textTheme.bodyMedium?.copyWith(
                  color: _quoteFailed
                      ? t.colorScheme.error
                      : t.colorScheme.outline,
                  height: 1.35,
                ),
              ),
            ],
            const SizedBox(height: 6),
            Text(
              l10n.phase1ValidityDependsOnOperator,
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.outline,
                height: 1.35,
              ),
            ),
          ],
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
                    label: o.line == TelecomServiceLine.airtime
                        ? l10n.telecomCheckoutAirtimeRowLabel
                        : l10n.packageLabel,
                    value: o.productTitle,
                    multiline: true,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              l10n.checkoutCardRegionLabel,
              style: t.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              border: Border.all(color: t.colorScheme.outline.withValues(alpha: 0.35)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _senderCountry,
                isExpanded: true,
                items: kPhase1SenderCountryCodes
                    .map(
                      (c) => DropdownMenuItem(
                        value: c,
                        child: Text(
                          '${kPhase1SenderCountryLabels[c] ?? c} ($c)',
                        ),
                      ),
                    )
                    .toList(),
                onChanged: _busy
                    ? null
                    : (v) {
                        if (v == null) return;
                        setState(() => _senderCountry = v);
                        unawaited(_loadPricingQuote());
                      },
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.checkoutSenderCountryHint,
            style: t.textTheme.bodySmall?.copyWith(
              color: t.colorScheme.outline,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 20),
          if (widget.order.line == TelecomServiceLine.airtime) ...[
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                l10n.orderSummary,
                style: t.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.2,
                ),
              ),
            ),
            const SizedBox(height: 10),
          ],
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
            child: widget.order.line == TelecomServiceLine.airtime
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_quoteBusy)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: t.colorScheme.primary,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  l10n.checkoutPricingLoading,
                                  style: t.textTheme.bodySmall?.copyWith(
                                    color: t.colorScheme.outline,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (_breakdown != null) ...[
                        _CheckoutPriceLine(
                          label: l10n.checkoutAirtimeValueLabel,
                          value: fmt.format(_breakdown!.productValueUsd),
                          emphasized: false,
                        ),
                        _CheckoutPriceLine(
                          label: l10n.checkoutSenderTaxLabel,
                          value: fmt.format(_breakdown!.taxUsd),
                          emphasized: false,
                        ),
                        _CheckoutPriceLine(
                          label: l10n.checkoutServiceFeeLabel,
                          value: fmt.format(_breakdown!.serviceFeeUsd),
                          emphasized: false,
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: Divider(
                            height: 1,
                            color: t.colorScheme.outline.withValues(alpha: 0.25),
                          ),
                        ),
                        _CheckoutPriceLine(
                          label: l10n.checkoutTotalChargedLabel,
                          value: fmt.format(_breakdown!.totalUsd),
                          emphasized: true,
                        ),
                        if (_quote?.pricingMeta != null &&
                            _quote!.pricingMeta!['jurisdictionAppliedToTax'] ==
                                false) ...[
                          Padding(
                            padding: const EdgeInsets.only(top: 10),
                            child: Text(
                              l10n.checkoutTaxJurisdictionPhaseNote,
                              style: t.textTheme.bodySmall?.copyWith(
                                color: t.colorScheme.outline,
                                height: 1.35,
                              ),
                            ),
                          ),
                        ],
                      ] else if (!_quoteBusy) ...[
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            _quoteFailed
                                ? l10n.checkoutQuoteFailed
                                : l10n.checkoutReviewHeadlinePricingUnavailable,
                            style: t.textTheme.bodyMedium?.copyWith(
                              color: _quoteFailed
                                  ? t.colorScheme.error
                                  : t.colorScheme.outline,
                              height: 1.35,
                            ),
                          ),
                        ),
                      ],
                    ],
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        l10n.checkoutScreenOrderTotalCaption,
                        style: t.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        _breakdown != null
                            ? fmt.format(_breakdown!.totalUsd)
                            : '—',
                        style: t.textTheme.headlineSmall?.copyWith(
                          color: t.colorScheme.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              l10n.checkoutScreenChargeFootnote,
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.outline,
              ),
            ),
          ),
          const SizedBox(height: 18),
          TrustStrip(),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: t.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(20),
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
                if (StripeKeys.publishableKey.trim().isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    l10n.checkoutTrustCallout,
                    style: t.textTheme.labelSmall?.copyWith(
                      color: t.colorScheme.primary.withValues(alpha: 0.95),
                      height: 1.4,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.15,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.checkoutScreenStripeSecureNote,
                    style: t.textTheme.bodySmall?.copyWith(
                      color: t.colorScheme.outline,
                      height: 1.45,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 28),
          ZwPrimaryButton(
            label: _busy
                ? l10n.checkoutSecuringCheckout
                : l10n.payWithStripe,
            icon: Icons.credit_card_rounded,
            onPressed: _busy ? null : _pay,
          ),
        ],
      ),
    );
  }
}

class _CheckoutPriceLine extends StatelessWidget {
  const _CheckoutPriceLine({
    required this.label,
    required this.value,
    required this.emphasized,
  });

  final String label;
  final String value;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final valueColor =
        emphasized ? t.colorScheme.primary : t.colorScheme.onSurface;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: (emphasized ? t.textTheme.titleMedium : t.textTheme.bodyMedium)
                  ?.copyWith(
                fontWeight: emphasized ? FontWeight.w800 : FontWeight.w500,
                color: emphasized
                    ? t.colorScheme.onSurface
                    : t.colorScheme.outline,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            value,
            style: (emphasized ? t.textTheme.headlineSmall : t.textTheme.titleSmall)
                ?.copyWith(
              color: valueColor,
              fontWeight: emphasized ? FontWeight.w800 : FontWeight.w600,
            ),
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
