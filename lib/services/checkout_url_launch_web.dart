// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:html' as html;

/// Web: full navigation in this tab — avoids popup blockers that block `window.open` after async checkout API calls.
Future<void> openStripeCheckoutPageImpl(Uri uri) async {
  html.window.location.assign(uri.toString());
}
