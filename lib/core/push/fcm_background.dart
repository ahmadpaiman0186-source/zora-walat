import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import '../../firebase_options.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  // OS presents notification when `notification` payload is set; data-only handled by client on open.
  if (message.messageId != null) {
    // ignore: avoid_print
    print('FCM background: ${message.messageId}');
  }
}
