import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../l10n/app_localizations.dart';

class OrderSafeCallout extends StatelessWidget {
  const OrderSafeCallout({super.key, required this.l10n});

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
          color: t.colorScheme.primary.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.verified_user_outlined, color: t.colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              l10n.paymentSafeBanner,
              style: t.textTheme.bodySmall?.copyWith(
                height: 1.45,
                color: t.colorScheme.onSurface.withValues(alpha: 0.9),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class OrderReceiptFields extends StatelessWidget {
  const OrderReceiptFields({
    super.key,
    required this.l10n,
    required this.orderId,
    required this.paymentLabel,
    required this.fulfillmentLabel,
    this.operatorLabel,
    this.phoneMasked,
    this.amountLabel,
    this.refSuffix,
    this.showCopyAction = false,
    this.onCopied,
  });

  final AppLocalizations l10n;
  final String orderId;
  final String paymentLabel;
  final String fulfillmentLabel;
  final String? operatorLabel;
  final String? phoneMasked;
  final String? amountLabel;
  final String? refSuffix;
  final bool showCopyAction;
  final VoidCallback? onCopied;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: t.colorScheme.surfaceContainerHighest.withValues(alpha: 0.75),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: t.colorScheme.outline.withValues(alpha: 0.2)),
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
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: SelectableText(
                  orderId,
                  style: t.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.15,
                  ),
                ),
              ),
              if (showCopyAction) ...[
                const SizedBox(width: 8),
                IconButton(
                  tooltip: l10n.ordersCopyReference,
                  onPressed: orderId.trim().isEmpty
                      ? null
                      : () async {
                          await Clipboard.setData(ClipboardData(text: orderId));
                          onCopied?.call();
                        },
                  icon: const Icon(Icons.copy_rounded, size: 22),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),
          OrderReceiptMiniRow(l10n.receiptPaymentStatus, paymentLabel, t),
          OrderReceiptMiniRow(l10n.receiptFulfillmentStatus, fulfillmentLabel, t),
          if (operatorLabel != null && operatorLabel!.isNotEmpty)
            OrderReceiptMiniRow(l10n.operatorLabel, operatorLabel!, t),
          if (phoneMasked != null && phoneMasked!.isNotEmpty)
            OrderReceiptMiniRow(l10n.phoneNumberLabel, phoneMasked!, t),
          if (amountLabel != null && amountLabel!.isNotEmpty)
            OrderReceiptMiniRow(l10n.totalUsd, amountLabel!, t),
          if (refSuffix != null && refSuffix!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              '${l10n.receiptCarrierRef}: $refSuffix',
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.outline,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class OrderReceiptMiniRow extends StatelessWidget {
  const OrderReceiptMiniRow(this.k, this.v, this.t, {super.key});

  final String k;
  final String v;
  final ThemeData t;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              k,
              style: t.textTheme.bodySmall?.copyWith(
                color: t.colorScheme.outline,
              ),
            ),
          ),
          Expanded(
            child: Text(
              v,
              style: t.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
