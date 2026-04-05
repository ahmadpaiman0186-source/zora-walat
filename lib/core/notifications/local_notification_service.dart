import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'notification_payload.dart';

/// Bridges notification taps when the app was launched from a background isolate.
class NotificationTapBridge {
  static void Function(String location)? navigate;
}

@pragma('vm:entry-point')
void zoraNotificationTapBackground(NotificationResponse response) {
  final loc = payloadToLocation(response.payload);
  if (loc != null) NotificationTapBridge.navigate?.call(loc);
}

/// OS-level local notifications (mobile/desktop). Web: inbox only.
class LocalNotificationService {
  LocalNotificationService._();

  static final LocalNotificationService instance = LocalNotificationService._();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  bool _initialized = false;
  void Function(String location)? _onNavigate;

  static const _androidChannelId = 'zora_updates';
  static const _androidChannelName = 'Zora-Walat updates';
  static const _androidChannelDesc = 'Order progress and recognition updates';

  Future<void> init({void Function(String location)? onNavigate}) async {
    _onNavigate = onNavigate;
    NotificationTapBridge.navigate = onNavigate;

    if (kIsWeb) {
      _initialized = true;
      return;
    }

    // Widget tests: FlutterLocalNotificationsPlatform is not registered.
    final bindingName = WidgetsBinding.instance.runtimeType.toString();
    if (bindingName.contains('TestWidgetsFlutterBinding')) {
      _initialized = true;
      return;
    }

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwinInit = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: androidInit,
      iOS: darwinInit,
      macOS: darwinInit,
    );

    await _plugin.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: _onResponse,
      onDidReceiveBackgroundNotificationResponse: zoraNotificationTapBackground,
    );

    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await android?.createNotificationChannel(
      const AndroidNotificationChannel(
        _androidChannelId,
        _androidChannelName,
        description: _androidChannelDesc,
        importance: Importance.high,
      ),
    );

    await android?.requestNotificationsPermission();

    _initialized = true;
  }

  void _onResponse(NotificationResponse response) {
    final loc = payloadToLocation(response.payload);
    if (loc != null) _onNavigate?.call(loc);
  }

  Future<void> show({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    if (kIsWeb || !_initialized) return;

    final android = AndroidNotificationDetails(
      _androidChannelId,
      _androidChannelName,
      channelDescription: _androidChannelDesc,
      importance: Importance.high,
      priority: Priority.high,
      styleInformation: BigTextStyleInformation(body),
    );
    const darwin = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    final details = NotificationDetails(
      android: android,
      iOS: darwin,
      macOS: darwin,
    );

    await _plugin.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: details,
      payload: payload,
    );
  }
}
