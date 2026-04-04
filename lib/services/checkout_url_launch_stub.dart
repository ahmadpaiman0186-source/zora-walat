import 'package:url_launcher/url_launcher.dart';

/// Mobile/desktop: open Stripe in external browser.
Future<void> openStripeCheckoutPageImpl(Uri uri) async {
  final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!ok) {
    throw StateError('Could not open Stripe Checkout.');
  }
}
