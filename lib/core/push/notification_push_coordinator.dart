import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, debugPrint, kIsWeb;
import 'package:flutter/widgets.dart';

import '../../firebase_options.dart';
import '../../services/api_service.dart';
import '../auth/auth_session.dart';
import '../notifications/app_notification_hub.dart';
import '../notifications/in_app_notification_store.dart';
import '../notifications/notification_payload.dart';

typedef NavigateFn = void Function(String location);

/// Wires FCM token registration, foreground notifications, inbox sync, and deep links.
class NotificationPushCoordinator {
  NotificationPushCoordinator({
    required ApiService api,
    required AppNotificationHub hub,
    required AuthSession auth,
    required InAppNotificationStore store,
    required NavigateFn onNavigate,
  })  : _api = api,
        _hub = hub,
        _auth = auth,
        _store = store,
        _onNavigate = onNavigate;

  final ApiService _api;
  final AppNotificationHub _hub;
  final AuthSession _auth;
  final InAppNotificationStore _store;
  final NavigateFn _onNavigate;

  bool _started = false;

  bool _isTestBinding() {
    final n = WidgetsBinding.instance.runtimeType.toString();
    return n.contains('TestWidgetsFlutterBinding');
  }

  Future<void> start() async {
    if (_started) return;
    if (kIsWeb) return;
    if (_isTestBinding()) return;
    if (defaultTargetPlatform != TargetPlatform.android &&
        defaultTargetPlatform != TargetPlatform.iOS) {
      return;
    }

    _started = true;

    try {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    } catch (e) {
      debugPrint('[push] Firebase.initializeApp skipped: $e');
      _started = false;
      return;
    }

    final messaging = FirebaseMessaging.instance;
    await messaging.setAutoInitEnabled(true);
    await messaging.requestPermission(alert: true, badge: true, sound: true);

    FirebaseMessaging.onMessage.listen(_onForeground);
    FirebaseMessaging.onMessageOpenedApp.listen(_onOpened);

    final initial = await messaging.getInitialMessage();
    if (initial != null) {
      _handleOpenedMessage(initial);
    }

    messaging.onTokenRefresh.listen(_onToken);

    _auth.addListener(_onAuthChanged);
    await _syncIfSignedIn();
  }

  void dispose() {
    _auth.removeListener(_onAuthChanged);
  }

  void _onAuthChanged() {
    _syncIfSignedIn();
  }

  Future<void> _syncIfSignedIn() async {
    if (!_auth.isAuthenticated) return;
    try {
      await _registerTokenIfPossible();
      final rows = await _api.fetchNotificationInbox(limit: 60);
      await _store.mergeServerInbox(rows);
    } catch (e) {
      debugPrint('[push] sync/register failed: $e');
    }
  }

  Future<void> _registerTokenIfPossible() async {
    if (!_auth.isAuthenticated) return;
    final t = await FirebaseMessaging.instance.getToken();
    if (t == null || t.isEmpty) return;
    final platform =
        defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android';
    try {
      await _api.registerPushDevice(token: t, platform: platform);
    } catch (e) {
      debugPrint('[push] register device failed: $e');
    }
  }

  void _onToken(String token) {
    if (!_auth.isAuthenticated) return;
    final platform =
        defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android';
    _api.registerPushDevice(token: token, platform: platform).catchError((e) {
      debugPrint('[push] token refresh register failed: $e');
    });
  }

  void _onForeground(RemoteMessage m) {
    final n = m.notification;
    final d = m.data;
    final title = n?.title ?? '';
    final body = n?.body ?? '';
    if (title.isEmpty && body.isEmpty) return;

    final payload = d['zw_payload'];
    final dedupe = d['zw_dedupe'];
    final category = d['zw_category'] ?? 'order';

    _hub.ingestRemote(
      title: title,
      body: body,
      category: category,
      payload: payload?.isNotEmpty == true ? payload : null,
      dedupeKey: dedupe?.isNotEmpty == true ? dedupe : null,
      serverId: null,
      serverRevision: null,
      showLocal: true,
    );
  }

  void _onOpened(RemoteMessage m) {
    _handleOpenedMessage(m);
  }

  void _handleOpenedMessage(RemoteMessage m) {
    final raw = m.data['zw_payload'];
    final loc = payloadToLocation(raw);
    if (loc != null && loc.isNotEmpty) {
      _onNavigate(loc);
    }
  }
}
