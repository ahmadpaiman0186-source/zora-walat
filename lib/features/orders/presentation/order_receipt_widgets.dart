import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../../../l10n/app_localizations.dart';
import '../domain/order_center_row.dart';
import '../domain/order_sync_source.dart';

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

/// High-signal receipt block (paid USD, delivered value, trust status, fees/FX notes).
class OrderTrustReceiptCard extends StatelessWidget {
  const OrderTrustReceiptCard({
    super.key,
    required this.l10n,
    required this.row,
  });

  final AppLocalizations l10n;
  final OrderCenterRow row;

  String _statusTitle(String? key) {
    switch (key) {
      case 'delivered':
        return l10n.orderTrustStatusDelivered;
      case 'delayed':
        return l10n.orderTrustStatusDelayed;
      case 'failed':
        return l10n.orderTrustStatusFailed;
      case 'cancelled':
        return l10n.orderTrustStatusCancelled;
      case 'processing':
      default:
        return l10n.orderTrustStatusProcessing;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (row.syncSource != OrderSyncSource.account) {
      return const SizedBox.shrink();
    }
    if (row.trustStatusKey == null && row.paidUsd == null) {
      return const SizedBox.shrink();
    }

    final t = Theme.of(context);
    final locale = Localizations.localeOf(context).toString();
    final usd = NumberFormat.currency(locale: locale, symbol: r'$');
    final paid = row.paidUsd;
    final delivered = row.deliveredValueUsd;
    final fee = row.processingFeeUsd;
    final feeFinal = row.processingFeeIsFinal == true;
    String? paidAtPretty;
    if (row.paidAtIso != null && row.paidAtIso!.trim().isNotEmpty) {
      final d = DateTime.tryParse(row.paidAtIso!);
      if (d != null) {
        paidAtPretty = DateFormat.yMMMd(locale).add_jm().format(d.toLocal());
      }
    }
    final updatedPretty = DateFormat.yMMMd(locale)
        .add_jm()
        .format(DateTime.tryParse(row.updatedAtIso)?.toLocal() ?? DateTime.now());

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: t.colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: t.colorScheme.outline.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.receiptTrustTitle,
            style: t.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 14),
          if (paid != null)
            OrderReceiptMiniRow(l10n.receiptTrustPaidUsd, usd.format(paid), t),
          if (delivered != null)
            OrderReceiptMiniRow(
              l10n.receiptTrustDeliveredValue,
              usd.format(delivered),
              t,
            ),
          if (row.trustStatusKey != null) ...[
            OrderReceiptMiniRow(
              l10n.receiptTrustStatus,
              _statusTitle(row.trustStatusKey),
              t,
            ),
            if (row.trustStatusDetail != null &&
                row.trustStatusDetail!.trim().isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(left: 0, bottom: 10),
                child: Text(
                  row.trustStatusDetail!,
                  style: t.textTheme.bodySmall?.copyWith(
                    color: t.colorScheme.outline,
                    height: 1.45,
                  ),
                ),
              ),
          ],
          if (paidAtPretty != null)
            OrderReceiptMiniRow(l10n.receiptTrustPaidAt, paidAtPretty, t),
          OrderReceiptMiniRow(l10n.receiptTrustUpdatedAt, updatedPretty, t),
          if (fee != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                feeFinal
                    ? l10n.receiptTrustFeeFinal(usd.format(fee))
                    : l10n.receiptTrustFeeEstimated(usd.format(fee)),
                style: t.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
            ),
          if (row.transparencyFxNote != null &&
              row.transparencyFxNote!.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              l10n.receiptTrustFxNoteTitle,
              style: t.textTheme.labelLarge?.copyWith(
                color: t.colorScheme.outline,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              row.transparencyFxNote!,
              style: t.textTheme.bodySmall?.copyWith(height: 1.45),
            ),
          ],
          if (row.transparencyDeliveryNote != null &&
              row.transparencyDeliveryNote!.trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              l10n.receiptTrustDeliveryNoteTitle,
              style: t.textTheme.labelLarge?.copyWith(
                color: t.colorScheme.outline,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              row.transparencyDeliveryNote!,
              style: t.textTheme.bodySmall?.copyWith(height: 1.45),
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
