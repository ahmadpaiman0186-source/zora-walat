import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/app_router.dart';
import '../../../l10n/app_localizations.dart';
import '../../../models/recharge_draft.dart';

/// Next step before package selection & Stripe — summary of recharge intent.
class RechargeReviewScreen extends StatelessWidget {
  const RechargeReviewScreen({super.key, required this.draft});

  final RechargeDraft draft;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final a = draft.amountUsd;
    final amount = a % 1 == 0 ? '\$${a.toInt()}' : '\$${a.toStringAsFixed(2)}';

    return Scaffold(
      appBar: AppBar(title: Text(l10n.rechargeReviewTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        children: [
          Text(
            l10n.rechargeReviewSubtitle,
            style: t.textTheme.bodyMedium?.copyWith(
              color: t.colorScheme.outline,
            ),
          ),
          const SizedBox(height: 24),
          _SummaryCard(
            rows: [
              _Row(l10n.recipientNumber, draft.phoneE164Style),
              _Row(l10n.operator, draft.operatorLabel),
              _Row(l10n.selectAmount, amount),
            ],
          ),
          const SizedBox(height: 32),
          FilledButton(
            onPressed: () => context.push(AppRoutePaths.telecom),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(54),
            ),
            child: Text(l10n.continueToPlans),
          ),
          const SizedBox(height: 12),
          Text(
            l10n.rechargeReviewStripeHint,
            textAlign: TextAlign.center,
            style: t.textTheme.bodySmall?.copyWith(
              color: t.colorScheme.outline,
            ),
          ),
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
