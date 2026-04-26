import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../l10n/app_localizations.dart';
import '../../../models/checkout_pricing_breakdown.dart';

/// Receipt block on [SuccessScreen]: order ref + optional pricing breakdown + status rows.
class SuccessReceiptCard extends StatelessWidget {
  const SuccessReceiptCard({
    super.key,
    required this.l10n,
    required this.orderRef,
    required this.paymentLabel,
    required this.fulfillmentLabel,
    this.sessionSnippet,
    this.providerRef,
    this.pricingBreakdown,
    this.orderChargedTotalCents,
    this.breakdownLoading = false,
  });

  final AppLocalizations l10n;
  final String orderRef;
  final String paymentLabel;
  final String fulfillmentLabel;
  final String? sessionSnippet;
  final String? providerRef;
  final CheckoutPricingBreakdown? pricingBreakdown;
  final int? orderChargedTotalCents;
  final bool breakdownLoading;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final fmt = NumberFormat.currency(
      locale: Localizations.localeOf(context).toString(),
      symbol: r'$',
    );
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
          if (pricingBreakdown != null) ...[
            const SizedBox(height: 16),
            Text(
              l10n.orderSummary,
              style: t.textTheme.labelLarge?.copyWith(
                color: t.colorScheme.outline,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            ReceiptSummaryRow(
              l10n.checkoutProductValueLabel,
              fmt.format(pricingBreakdown!.productValueUsd),
              t,
            ),
            ReceiptSummaryRow(
              l10n.checkoutSenderTaxLabel,
              fmt.format(pricingBreakdown!.taxUsd),
              t,
            ),
            ReceiptSummaryRow(
              l10n.checkoutServiceFeeLabel,
              fmt.format(pricingBreakdown!.serviceFeeUsd),
              t,
            ),
            ReceiptSummaryRow(
              l10n.checkoutTotalChargedLabel,
              fmt.format(pricingBreakdown!.totalUsd),
              t,
              emphasize: true,
            ),
          ] else if (breakdownLoading) ...[
            const SizedBox(height: 16),
            Text(
              l10n.receiptBreakdownLoadingHint,
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.outline,
                height: 1.4,
              ),
            ),
          ] else if (orderChargedTotalCents != null) ...[
            const SizedBox(height: 16),
            Text(
              l10n.receiptBreakdownPartialHint,
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.outline,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 10),
            ReceiptSummaryRow(
              l10n.checkoutTotalChargedLabel,
              fmt.format(orderChargedTotalCents! / 100.0),
              t,
              emphasize: true,
            ),
          ],
          const SizedBox(height: 16),
          ReceiptSummaryRow(l10n.receiptPaymentStatus, paymentLabel, t),
          ReceiptSummaryRow(l10n.receiptFulfillmentStatus, fulfillmentLabel, t),
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

class ReceiptSummaryRow extends StatelessWidget {
  const ReceiptSummaryRow(
    this.label,
    this.value,
    this.t, {
    super.key,
    this.emphasize = false,
  });

  final String label;
  final String value;
  final ThemeData t;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final valueStyle = emphasize
        ? t.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w800,
            color: t.colorScheme.primary,
          )
        : t.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          );
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
                fontWeight: emphasize ? FontWeight.w600 : null,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: valueStyle,
            ),
          ),
        ],
      ),
    );
  }
}
