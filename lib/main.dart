import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/config/app_config.dart';
import 'core/locale/locale_controller.dart';
import 'core/onboarding/onboarding_prefs.dart';
import 'features/telecom/data/remote_telecom_service.dart';
import 'features/telecom/data/telecom_service.dart';
import 'features/transactions/data/transaction_log_store.dart';
import 'services/api_service.dart';
import 'services/payment_service.dart';
import 'stripe_keys.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final publishableKey = StripeKeys.publishableKey.trim();
  if (publishableKey.isNotEmpty) {
    Stripe.publishableKey = publishableKey;
    await Stripe.instance.applySettings();
  }

  final prefs = await SharedPreferences.getInstance();
  final localeController = LocaleController(prefs);
  final onboardingPrefs = OnboardingPrefs(prefs);
  final transactionLog = TransactionLogStore(prefs);

  final paymentService = StripePaymentService();
  final httpClient = http.Client();
  final apiBase = AppConfig.apiBaseUrl.trim().replaceAll(RegExp(r'/+$'), '');
  final apiService = ApiService(client: httpClient, baseUrl: apiBase);

  final TelecomService telecomService =
      AppConfig.paymentsApiBaseUrl.trim().isEmpty
      ? const PlaceholderTelecomService()
      : RemoteTelecomService(
          client: httpClient,
          baseUrl: AppConfig.paymentsApiBaseUrl.trim().replaceAll(
            RegExp(r'/+$'),
            '',
          ),
        );

  runApp(
    ZoraWalatApp(
      localeController: localeController,
      onboardingPrefs: onboardingPrefs,
      paymentService: paymentService,
      telecomService: telecomService,
      transactionLog: transactionLog,
      apiService: apiService,
    ),
  );
}
