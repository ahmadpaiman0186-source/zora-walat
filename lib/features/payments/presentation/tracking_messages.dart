import '../../../l10n/app_localizations.dart';
import '../domain/customer_order_tracking.dart';

/// Premium microcopy for order tracking (maps stage → l10n).
abstract final class TrackingMessages {
  static (String headline, String body) forTracking(
    AppLocalizations l10n,
    CustomerOrderTracking t,
  ) {
    switch (t.stage) {
      case CustomerTrackingStage.delivered:
        return (l10n.trackingHeadlineDelivered, l10n.trackingBodyDelivered);
      case CustomerTrackingStage.failed:
      case CustomerTrackingStage.failedTerminally:
        return (l10n.trackingHeadlineNeedsHelp, l10n.trackingBodyFailedCalm);
      case CustomerTrackingStage.retrying:
        return (l10n.trackingHeadlineRetrying, l10n.trackingBodyRetrying);
      case CustomerTrackingStage.sendingToOperator:
        return (l10n.trackingHeadlineSending, l10n.trackingBodySending);
      case CustomerTrackingStage.verifying:
        return (l10n.trackingHeadlineVerifying, l10n.trackingBodyVerifying);
      case CustomerTrackingStage.preparingTopup:
        return (l10n.trackingHeadlinePreparing, l10n.trackingBodyPreparing);
      case CustomerTrackingStage.paymentConfirming:
        return (
          l10n.trackingHeadlinePaymentConfirming,
          l10n.trackingBodyPaymentConfirming,
        );
      case CustomerTrackingStage.paymentReceived:
        return (
          l10n.trackingHeadlinePaymentReceived,
          l10n.trackingBodyPaymentReceived,
        );
      case CustomerTrackingStage.delayed:
        return (l10n.trackingHeadlineCatchingUp, l10n.trackingBodyCatchingUp);
      case CustomerTrackingStage.orderCancelled:
        return (
          l10n.trackingHeadlineCancelled,
          l10n.trackingBodyCancelled,
        );
    }
  }

  static (String headline, String body) signIn(AppLocalizations l10n) {
    return (
      l10n.trackingHeadlineSignIn,
      l10n.trackingBodySignIn,
    );
  }
}
