// File generated / stubbed for Firebase — replace with `flutterfire configure` output
// for production (real `projectId`, keys, and ids). Values below are non-functional placeholders.

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for use with your Firebase apps.
///
/// Run: `dart pub global activate flutterfire_cli` then `flutterfire configure`.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyAqcluxHBlrIjv8HXUol00-gMpBoMgAeog',
    appId: '1:1060511706874:web:ced4f3604b6389dd502343',
    messagingSenderId: '1060511706874',
    projectId: 'zora-walat-b90bb',
    authDomain: 'zora-walat-b90bb.firebaseapp.com',
    storageBucket: 'zora-walat-b90bb.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyA2xRoDw5A3_vLEWyV9OCMfHvx77IuZT1A',
    appId: '1:1060511706874:android:18fe3367af33d866502343',
    messagingSenderId: '1060511706874',
    projectId: 'zora-walat-b90bb',
    storageBucket: 'zora-walat-b90bb.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'REPLACE_IOS_API_KEY',
    appId: '1:000000000000:ios:0000000000000000000000',
    messagingSenderId: '000000000000',
    projectId: 'replace-with-your-firebase-project',
    storageBucket: 'replace-with-your-firebase-project.appspot.com',
    iosBundleId: 'com.example.zoraWalat',
  );
}