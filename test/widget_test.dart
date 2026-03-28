import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'package:zora_walat/app.dart';
import 'package:zora_walat/core/locale/locale_controller.dart';
import 'package:zora_walat/core/onboarding/onboarding_prefs.dart';
import 'package:zora_walat/features/payments/data/payment_service.dart';
import 'package:zora_walat/features/payments/domain/payment_result.dart';
import 'package:zora_walat/features/telecom/data/telecom_service.dart';
import 'package:zora_walat/features/telecom/domain/telecom_order.dart';
import 'package:zora_walat/features/transactions/data/transaction_log_store.dart';
import 'package:zora_walat/services/api_service.dart';

class _FakePaymentService implements PaymentService {
  @override
  Future<PaymentResult> pay(TelecomOrder order) async =>
      const PaymentSuccess();
}

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

    await tester.pumpWidget(
      ZoraWalatApp(
        localeController: localeController,
        onboardingPrefs: onboardingPrefs,
        paymentService: _FakePaymentService(),
        telecomService: const PlaceholderTelecomService(),
        transactionLog: log,
        apiService: ApiService(client: http.Client(), baseUrl: 'http://localhost:0'),
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
