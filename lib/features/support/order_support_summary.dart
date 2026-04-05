import 'package:intl/intl.dart';

import '../../l10n/app_localizations.dart';
import '../orders/domain/order_center_row.dart';

/// Customer-safe, copyable support packet (no raw PII beyond masked recipient).
abstract final class OrderSupportSummary {
  static String buildPacket(
    AppLocalizations l10n,
    OrderCenterRow row, {
    required String paymentLabel,
    required String fulfillmentLabel,
    String localeName = 'en',
  }) {
    final df = DateFormat.yMMMd(localeName).add_jm();
    DateTime? updated;
    try {
      updated = DateTime.tryParse(row.updatedAtIso);
    } catch (_) {}
    final timeStr =
        updated != null ? df.format(updated.toLocal()) : row.updatedAtIso;

    final buf = StringBuffer()
      ..writeln(l10n.supportPacketHeader)
      ..writeln()
      ..writeln('${l10n.supportPacketOrderRef}: ${row.orderId}')
      ..writeln('${l10n.supportPacketRoute}: ${l10n.supportPacketRouteValue}');

    final op = row.operatorLabel?.trim();
    if (op != null && op.isNotEmpty) {
      buf.writeln('${l10n.operatorLabel}: $op');
    }
    final phone = row.phoneMasked?.trim();
    if (phone != null && phone.isNotEmpty) {
      buf.writeln('${l10n.supportPacketRecipient}: $phone');
    }
    final amt = row.amountLabel?.trim();
    if (amt != null && amt.isNotEmpty) {
      buf.writeln('${l10n.totalUsd}: $amt');
    }
    buf
      ..writeln('${l10n.receiptPaymentStatus}: $paymentLabel')
      ..writeln('${l10n.receiptFulfillmentStatus}: $fulfillmentLabel')
      ..writeln('${l10n.supportPacketUpdated}: $timeStr');

    final ref = row.providerReferenceSuffix?.trim();
    if (ref != null && ref.isNotEmpty) {
      buf.writeln('${l10n.receiptCarrierRef}: $ref');
    }

    return buf.toString();
  }
}
