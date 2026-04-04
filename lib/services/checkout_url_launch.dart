import 'checkout_url_launch_stub.dart'
    if (dart.library.html) 'checkout_url_launch_web.dart';

/// Opens hosted Stripe Checkout (same tab on web; external browser on mobile/desktop).
Future<void> openStripeCheckoutPage(Uri uri) => openStripeCheckoutPageImpl(uri);
