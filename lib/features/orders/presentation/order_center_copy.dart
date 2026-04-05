import '../../../l10n/app_localizations.dart';
import '../../payments/domain/customer_order_tracking.dart';
import '../../payments/presentation/tracking_messages.dart';
import '../domain/order_center_row.dart';

/// Resolves calm customer copy for an [OrderCenterRow] (prefers device-stored headline).
class OrderCenterCopy {
  static (CustomerOrderTracking tracking, String headline, String body) forRow(
    OrderCenterRow row,
    AppLocalizations l10n,
  ) {
    final tracking = CustomerOrderTracking.fromServerTrackingStageKey(
      row.trackingStageKey,
    );
    final msgs = TrackingMessages.forTracking(l10n, tracking);
    final stored = row.storedStatusHeadline?.trim();
    final headline =
        (stored != null && stored.isNotEmpty) ? stored : msgs.$1;
    return (tracking, headline, msgs.$2);
  }
}
