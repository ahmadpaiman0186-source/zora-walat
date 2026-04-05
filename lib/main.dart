import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/auth/auth_session.dart';
// Backend REST base URL: [AppConfig.apiBaseUrl] in core/config/app_config.dart
import 'core/config/app_config.dart';
import 'core/config/supabase_config.dart';
import 'core/locale/locale_controller.dart';
import 'core/onboarding/onboarding_prefs.dart';
import 'features/telecom/data/remote_telecom_service.dart';
import 'features/telecom/data/telecom_service.dart';
import 'features/orders/data/local_order_history_store.dart';
import 'features/transactions/data/transaction_log_store.dart';
import 'core/notifications/app_notification_hub.dart';
import 'core/notifications/in_app_notification_store.dart';
import 'core/push/fcm_background.dart';
import 'services/api_service.dart';
import 'services/auth_api_service.dart';
import 'services/payment_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!kIsWeb) {
    try {
      FirebaseMessaging.onBackgroundMessage(
        firebaseMessagingBackgroundHandler,
      );
    } catch (_) {
      /* Desktop / unsupported embedding */
    }
  }
  await Supabase.initialize(
    url: SupabaseConfig.supabaseUrl,
    anonKey: SupabaseConfig.supabaseAnonKey,
  );
  if (kIsWeb) {
    usePathUrlStrategy();
  }

  final prefs = await SharedPreferences.getInstance();
  final localeController = LocaleController(prefs);
  final onboardingPrefs = OnboardingPrefs(prefs);
  final transactionLog = TransactionLogStore(prefs);
  final orderHistory = LocalOrderHistoryStore(prefs);

  final httpClient = http.Client();
  final apiBase = AppConfig.apiBaseUrl.trim().replaceAll(RegExp(r'/+$'), '');
  final authSession = AuthSession(prefs);
  await authSession.restore();
  final authApiService = AuthApiService(client: httpClient, baseUrl: apiBase);
  final apiService = ApiService(
    client: httpClient,
    baseUrl: apiBase,
    authSession: authSession,
    authApi: authApiService,
  );
  final paymentService = PaymentService(api: apiService);

  final notificationStore = InAppNotificationStore(prefs);
  final notificationHub = AppNotificationHub(store: notificationStore);

  final TelecomService telecomService =
      AppConfig.apiBaseUrl.trim().isEmpty
          ? const PlaceholderTelecomService()
          : RemoteTelecomService(
              client: httpClient,
              baseUrl: AppConfig.apiBaseUrl.trim().replaceAll(
                RegExp(r'/+$'),
                '',
              ),
            );

  runApp(
    ZoraWalatApp(
      localeController: localeController,
      onboardingPrefs: onboardingPrefs,
      authSession: authSession,
      authApiService: authApiService,
      paymentService: paymentService,
      telecomService: telecomService,
      transactionLog: transactionLog,
      orderHistory: orderHistory,
      apiService: apiService,
      notificationStore: notificationStore,
      notificationHub: notificationHub,
    ),
  );
}
