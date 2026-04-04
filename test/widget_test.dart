import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'package:zora_walat/app.dart';
import 'package:zora_walat/core/auth/auth_session.dart';
import 'package:zora_walat/core/locale/locale_controller.dart';
import 'package:zora_walat/core/onboarding/onboarding_prefs.dart';
import 'package:zora_walat/features/telecom/data/telecom_service.dart';
import 'package:zora_walat/features/transactions/data/transaction_log_store.dart';
import 'package:zora_walat/services/api_service.dart';
import 'package:zora_walat/services/auth_api_service.dart';
import 'package:zora_walat/services/payment_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Home is recharge — Zora-Walat title and Mobile Recharge', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({
      'zw_language_onboarding_complete': true,
      'zw_app_locale_code': 'en',
    });
    final prefs = await SharedPreferences.getInstance();
    final localeController = LocaleController(prefs);
    final onboardingPrefs = OnboardingPrefs(prefs);
    final log = TransactionLogStore(prefs);
    final httpClient = http.Client();
    const base = 'http://localhost:0';
    final authSession = AuthSession(prefs);
    await authSession.restore();
    final authApi = AuthApiService(client: httpClient, baseUrl: base);
    final apiService = ApiService(
      client: httpClient,
      baseUrl: base,
      authSession: authSession,
      authApi: authApi,
    );
    final paymentService = PaymentService(api: apiService);

    await tester.pumpWidget(
      ZoraWalatApp(
        localeController: localeController,
        onboardingPrefs: onboardingPrefs,
        authSession: authSession,
        authApiService: authApi,
        paymentService: paymentService,
        telecomService: const PlaceholderTelecomService(),
        transactionLog: log,
        apiService: apiService,
      ),
    );
    await tester.pump(const Duration(milliseconds: 2300));
    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.text('Zora-Walat'), findsWidgets);
    expect(find.text('Mobile recharge'), findsOneWidget);
    expect(
      find.text('Continue', skipOffstage: false),
      findsOneWidget,
    );
    expect(
      find.text('Get packages', skipOffstage: false),
      findsOneWidget,
    );
  });
}
