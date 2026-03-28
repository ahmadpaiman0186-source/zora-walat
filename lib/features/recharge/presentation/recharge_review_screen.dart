import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../features/payments/domain/payment_result.dart';
import '../../../l10n/app_localizations.dart';
import '../../../models/recharge_draft.dart';

/// Review → Stripe PaymentSheet → success / failure / cancelled.
class RechargeReviewScreen extends StatefulWidget {
  const RechargeReviewScreen({super.key, required this.draft});

  final RechargeDraft draft;

  @override
  State<RechargeReviewScreen> createState() => _RechargeReviewScreenState();
}

enum _PaymentPhase { idle, processing, success, failure, cancelled }

class _RechargeReviewScreenState extends State<RechargeReviewScreen> {
  _PaymentPhase _phase = _PaymentPhase.idle;
  String? _errorMessage;

  String get _amountLabel {
    final a = widget.draft.amountUsd;
    return a % 1 == 0 ? '\$${a.toInt()}' : '\$${a.toStringAsFixed(2)}';
  }

  Future<void> _pay() async {
    final payment = AppScope.of(context).paymentService;
    final messenger = ScaffoldMessenger.maybeOf(context);
    setState(() {
      _phase = _PaymentPhase.processing;
      _errorMessage = null;
    });

    final result = await payment.payRechargeDraft(widget.draft);

    if (!mounted) return;

    switch (result) {
      case PaymentSuccess():
        setState(() => _phase = _PaymentPhase.success);
      case PaymentFailure(:final message):
        setState(() {
          _phase = _PaymentPhase.failure;
          _errorMessage = message;
        });
        messenger?.showSnackBar(
          SnackBar(content: Text(message)),
        );
      case PaymentCancelled():
        setState(() => _phase = _PaymentPhase.cancelled);
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
          if (_phase == _PaymentPhase.success) ...[
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
                Icon(Icons.error_outline_rounded,
                    size: 56, color: t.colorScheme.error),
                const SizedBox(height: 16),
                Text(
                  l10n.paymentFailedTitle,
                  style: t.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                if (_errorMessage != null)
                  Text(
                    _errorMessage!,
                    style: t.textTheme.bodyMedium?.copyWith(
                      color: t.colorScheme.outline,
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
                const SizedBox(height: 24),
                _SummaryCard(
                  rows: [
                    _Row(l10n.recipientNumber, widget.draft.phoneE164Style),
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
