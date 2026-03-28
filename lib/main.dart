import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/config/app_config.dart';
import 'core/locale/locale_controller.dart';
import 'features/payments/data/stripe_payment_service.dart';
import 'features/telecom/data/remote_telecom_service.dart';
import 'features/telecom/data/telecom_service.dart';
import 'features/transactions/data/transaction_log_store.dart';
import 'services/api_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final prefs = await SharedPreferences.getInstance();
  final localeController = LocaleController(prefs);
  final transactionLog = TransactionLogStore(prefs);

  if (AppConfig.stripePublishableKey.isNotEmpty) {
    Stripe.publishableKey = AppConfig.stripePublishableKey;
  }

  final paymentService = StripePaymentService();
  final httpClient = http.Client();
  final apiBase =
      AppConfig.apiBaseUrl.trim().replaceAll(RegExp(r'/+$'), '');
  final apiService = ApiService(client: httpClient, baseUrl: apiBase);

  final TelecomService telecomService =
      AppConfig.paymentsApiBaseUrl.trim().isEmpty
          ? const PlaceholderTelecomService()
          : RemoteTelecomService(
              client: httpClient,
              baseUrl: AppConfig.paymentsApiBaseUrl
                  .trim()
                  .replaceAll(RegExp(r'/+$'), ''),
            );

  // Home route `/` is [RechargeScreen] (see `createAppRouter`).
  runApp(
    ZoraWalatApp(
      localeController: localeController,
      paymentService: paymentService,
      telecomService: telecomService,
      transactionLog: transactionLog,
      apiService: apiService,
    ),
  );
}
