import 'dart:async' show unawaited;

import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/email_verification_required_exception.dart';
import '../../../core/auth/unauthorized_exception.dart';
import '../../../core/business/sender_country.dart';
import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/trust_strip.dart';
import '../../../models/recharge_draft.dart';

/// Review → pay: in-app PaymentSheet (non-web) or Stripe Checkout redirect (web).
class RechargeReviewScreen extends StatefulWidget {
  const RechargeReviewScreen({super.key, required this.draft});

  final RechargeDraft draft;

  @override
  State<RechargeReviewScreen> createState() => _RechargeReviewScreenState();
}

enum _PaymentPhase {
  idle,
  processing,
  success,
  failure,
  cancelled,
  hostedCheckout,
}

class _RechargeReviewScreenState extends State<RechargeReviewScreen> {
  _PaymentPhase _phase = _PaymentPhase.idle;
  String? _errorMessage;
  late String _senderCountry;

  @override
  void initState() {
    super.initState();
    _senderCountry = inferSenderCountryCodeFromLocale(
      WidgetsBinding.instance.platformDispatcher.locale.countryCode,
    );
  }

  String get _amountLabel {
    final a = widget.draft.amountUsd;
    return a % 1 == 0 ? '\$${a.toInt()}' : '\$${a.toStringAsFixed(2)}';
  }

  Future<void> _pay() async {
    if (_phase == _PaymentPhase.processing) return;
    final l10n = AppLocalizations.of(context);
    final router = GoRouter.of(context);
    final paymentService = AppScope.of(context).paymentService;
    final log = AppScope.of(context).transactionLog;
    final messenger = ScaffoldMessenger.maybeOf(context);
    final cents = (widget.draft.amountUsd * 100).round();
    setState(() {
      _phase = _PaymentPhase.processing;
      _errorMessage = null;
    });

    unawaited(
      log
          .append({
            'event': 'recharge_payment_attempt',
            'amount_usd_cents': cents,
            'operator': widget.draft.operatorKey,
          })
          .catchError((_) {}),
    );

    try {
      await paymentService.startCheckout(
        amountUsdCents: cents,
        senderCountry: _senderCountry,
        currency: 'usd',
        operatorKey: widget.draft.operatorKey,
        recipientPhone: widget.draft.phoneE164Style,
      );
      unawaited(
        log
            .append({
              'event': 'recharge_checkout_redirect',
              'amount_usd_cents': cents,
            })
            .catchError((_) {}),
      );
      if (!mounted) return;
      setState(() => _phase = _PaymentPhase.hostedCheckout);
    } on UnauthorizedException catch (_) {
      unawaited(
        log
            .append({
              'event': 'recharge_payment_failure',
              'message': 'unauthorized',
            })
            .catchError((_) {}),
      );
      if (!mounted) return;
      setState(() {
        _phase = _PaymentPhase.failure;
        _errorMessage = l10n.authRequiredMessage;
      });
      messenger?.showSnackBar(
        SnackBar(content: Text(l10n.authRequiredMessage)),
      );
      if (mounted) router.push(AppRoutePaths.signIn);
    } on EmailVerificationRequiredException catch (e) {
      unawaited(
        log
            .append({
              'event': 'recharge_payment_failure',
              'message': 'email_verification_required',
            })
            .catchError((_) {}),
      );
      if (!mounted) return;
      final email = AppScope.authSessionOf(context).userEmail ?? '';
      setState(() {
        _phase = _PaymentPhase.failure;
        _errorMessage = e.message;
      });
      messenger?.showSnackBar(SnackBar(content: Text(e.message)));
      if (email.isNotEmpty && mounted) {
        router.push(
          '${AppRoutePaths.signInOtp}?email=${Uri.encodeComponent(email)}',
        );
      }
    } catch (e) {
      unawaited(
        log
            .append({
              'event': 'recharge_payment_failure',
              'message': '$e',
            })
            .catchError((_) {}),
      );
      if (!mounted) return;
      final msg = kReleaseMode ? l10n.authGenericError : '$e';
      setState(() {
        _phase = _PaymentPhase.failure;
        _errorMessage = msg;
      });
      messenger?.showSnackBar(
        SnackBar(content: Text(msg)),
      );
    }
  }

  void _resetToIdle() {
    setState(() {
      _phase = _PaymentPhase.idle;
      _errorMessage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.rechargeReviewTitle),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        children: [
          if (_phase == _PaymentPhase.processing) ...[
            const LinearProgressIndicator(),
            const SizedBox(height: 16),
          ],
          if (_phase == _PaymentPhase.hostedCheckout) ...[
                Icon(Icons.open_in_new_rounded,
                    size: 64, color: t.colorScheme.primary),
                const SizedBox(height: 16),
                Text(
                  l10n.paymentCheckoutRedirectTitle,
                  style: t.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.paymentCheckoutRedirectBody,
                  style: t.textTheme.bodyMedium?.copyWith(
                    color: t.colorScheme.outline,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 28),
                FilledButton(
                  onPressed: () => context.push(AppRoutePaths.telecom),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(54),
                  ),
                  child: Text(l10n.continueToPlans),
                ),
              ] else if (_phase == _PaymentPhase.success) ...[
                Icon(Icons.check_circle_rounded,
                    size: 64, color: t.colorScheme.primary),
                const SizedBox(height: 16),
                Text(
                  l10n.paymentSuccessTitle,
                  style: t.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.paymentSuccessBody,
                  style: t.textTheme.bodyMedium?.copyWith(
                    color: t.colorScheme.outline,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 28),
                FilledButton(
                  onPressed: () => context.push(AppRoutePaths.telecom),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(54),
                  ),
                  child: Text(l10n.continueToPlans),
                ),
              ] else if (_phase == _PaymentPhase.failure) ...[
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: t.colorScheme.error.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.hourglass_disabled_outlined,
                    size: 48,
                    color: t.colorScheme.error.withValues(alpha: 0.85),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  l10n.rechargeFailureCalmTitle,
                  textAlign: TextAlign.center,
                  style: t.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  l10n.rechargeFailureCalmBody,
                  textAlign: TextAlign.center,
                  style: t.textTheme.bodyMedium?.copyWith(
                    color: t.colorScheme.outline,
                    height: 1.45,
                  ),
                ),
                if (_errorMessage != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: t.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: t.colorScheme.outline.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: t.textTheme.bodySmall?.copyWith(height: 1.4),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                const TrustStrip(compact: true),
                const SizedBox(height: 28),
                FilledButton(
                  onPressed: _resetToIdle,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(54),
                  ),
                  child: Text(l10n.paymentTryAgain),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => context.pop(),
                  child: Text(l10n.paymentBackToReview),
                ),
              ] else if (_phase == _PaymentPhase.cancelled) ...[
                Icon(Icons.cancel_outlined,
                    size: 56, color: t.colorScheme.outline),
                const SizedBox(height: 16),
                Text(
                  l10n.paymentCancelledTitle,
                  style: t.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.paymentCancelledBody,
                  style: t.textTheme.bodyMedium?.copyWith(
                    color: t.colorScheme.outline,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 28),
                FilledButton(
                  onPressed: _resetToIdle,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(54),
                  ),
                  child: Text(l10n.paymentTryAgain),
                ),
              ] else ...[
                Text(
                  l10n.rechargeReviewSubtitle,
                  style: t.textTheme.bodyMedium?.copyWith(
                    color: t.colorScheme.outline,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  l10n.rechargeReviewServerPricingNote,
                  style: t.textTheme.bodySmall?.copyWith(
                    color: t.colorScheme.outline,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 20),
                const TrustStrip(compact: true),
                const SizedBox(height: 20),
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
                    border: Border.all(
                      color: t.colorScheme.outline.withValues(alpha: 0.35),
                    ),
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
                      onChanged: _phase == _PaymentPhase.processing
                          ? null
                          : (v) {
                              if (v != null) setState(() => _senderCountry = v);
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
                const SizedBox(height: 16),
                _SummaryCard(
                  rows: [
                    _Row(l10n.recipientNumber, widget.draft.recipientDisplayPhone),
                    _Row(l10n.operator, widget.draft.operatorLabel),
                    _Row(l10n.selectAmount, _amountLabel),
                  ],
                ),
                const SizedBox(height: 28),
                FilledButton(
                  onPressed: _phase == _PaymentPhase.processing ? null : _pay,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(54),
                  ),
                  child: Text(l10n.paymentPayWithCard(_amountLabel)),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: _phase == _PaymentPhase.processing
                      ? null
                      : () => context.push(AppRoutePaths.telecom),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                  ),
                  child: Text(l10n.continueToPlans),
                ),
                const SizedBox(height: 16),
                Text(
                  l10n.rechargeReviewStripeHint,
                  textAlign: TextAlign.center,
                  style: t.textTheme.bodySmall?.copyWith(
                    color: t.colorScheme.outline,
                  ),
                ),
                if (_phase == _PaymentPhase.processing) ...[
                  const SizedBox(height: 12),
                  Text(
                    l10n.paymentPreparing,
                    textAlign: TextAlign.center,
                    style: t.textTheme.bodySmall?.copyWith(
                      color: t.colorScheme.primary,
                    ),
                  ),
                ],
              ],
        ],
      ),
    );
  }
}

class _Row {
  const _Row(this.label, this.value);
  final String label;
  final String value;
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.rows});

  final List<_Row> rows;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: t.colorScheme.outline.withValues(alpha: 0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            for (var i = 0; i < rows.length; i++) ...[
              if (i > 0) const Divider(height: 28),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(
                      rows[i].label,
                      style: t.textTheme.bodySmall?.copyWith(
                        color: t.colorScheme.outline,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Text(
                      rows[i].value,
                      textAlign: TextAlign.end,
                      style: t.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
