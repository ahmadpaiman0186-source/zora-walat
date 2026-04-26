import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'package:zora_walat/core/auth/auth_session.dart';
import 'package:zora_walat/core/di/app_scope.dart';
import 'package:zora_walat/core/notifications/app_notification_hub.dart';
import 'package:zora_walat/core/onboarding/onboarding_prefs.dart';
import 'package:zora_walat/features/telecom/domain/mobile_operator.dart';
import 'package:zora_walat/features/telecom/domain/phone_number.dart';
import 'package:zora_walat/features/telecom/domain/telecom_order.dart';
import 'package:zora_walat/features/telecom/domain/telecom_service_line.dart';
import 'package:zora_walat/features/telecom/presentation/checkout_screen.dart';
import 'package:zora_walat/l10n/app_localizations.dart';
import 'package:zora_walat/models/checkout_pricing_breakdown.dart';
import 'package:zora_walat/models/checkout_pricing_quote_response.dart';
import 'package:zora_walat/services/api_service.dart';
import 'package:zora_walat/services/auth_api_service.dart';
import 'package:zora_walat/services/payment_service.dart';
import 'package:zora_walat/features/orders/data/local_order_history_store.dart';
import 'package:zora_walat/features/transactions/data/transaction_log_store.dart';
import 'package:zora_walat/features/telecom/data/telecom_service.dart';
import 'package:zora_walat/core/notifications/in_app_notification_store.dart';

/// Deterministic quote for widget tests — no HTTP.
class _FakeQuotePaymentService extends PaymentService {
  _FakeQuotePaymentService({required super.api});

  @override
  Future<CheckoutPricingQuoteResponse?> fetchCheckoutPricingQuote({
    required int amountCents,
    required String senderCountry,
    String currency = 'usd',
    String? operatorKey,
    String? recipientPhone,
    String? packageId,
    Map<String, dynamic>? billingJurisdiction,
  }) async {
    return CheckoutPricingQuoteResponse(
      breakdown: const CheckoutPricingBreakdown(
        productValueUsdCents: 500,
        governmentTaxUsdCents: 10,
        zoraServiceFeeUsdCents: 15,
        totalUsdCents: 525,
      ),
      pricingMeta: const {'jurisdictionAppliedToTax': false},
    );
  }
}

void main() {
  testWidgets(
    'Telecom CheckoutScreen (Review): headline is total charged; summary shows airtime, tax, fee, total',
    (tester) async {
      TestWidgetsFlutterBinding.ensureInitialized();
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final session = AuthSession(prefs);
      final api = ApiService(
        client: http.Client(),
        baseUrlOverride: 'http://127.0.0.1:8787',
        authSession: session,
        authApi: null,
      );
      final payment = _FakeQuotePaymentService(api: api);
      final onboarding = OnboardingPrefs(prefs);
      final txLog = TransactionLogStore(prefs);
      final orderHistory = LocalOrderHistoryStore(prefs);
      final notifStore = InAppNotificationStore(prefs);
      final hub = AppNotificationHub(store: notifStore);

      const order = TelecomOrder(
        line: TelecomServiceLine.airtime,
        operator: MobileOperator.roshan,
        phone: PhoneNumber('+93701234567'),
        productId: 'pkg_test',
        productTitle: 'Test bundle',
        finalUsdCents: 500,
        metadata: {},
      );

      await tester.pumpWidget(
        MaterialApp(
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          locale: const Locale('en'),
          home: AppScope(
            authSession: session,
            onboardingPrefs: onboarding,
            paymentService: payment,
            telecomService: const PlaceholderTelecomService(),
            transactionLog: txLog,
            orderHistory: orderHistory,
            apiService: api,
            authApiService: AuthApiService(client: http.Client(), baseUrl: ''),
            notificationStore: notifStore,
            notificationHub: hub,
            child: const CheckoutScreen(order: order),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // ListView may keep offstage children; match full subtree for labels below the fold.
      expect(
        find.textContaining('Total charged:', skipOffstage: false),
        findsWidgets,
      );
      expect(find.textContaining('5.25', skipOffstage: false), findsWidgets);
      expect(
        find.text('Airtime value', skipOffstage: false),
        findsOneWidget,
      );
      expect(
        find.text('Tax (sender jurisdiction)', skipOffstage: false),
        findsOneWidget,
      );
      expect(
        find.text('Zora-Walat service fee', skipOffstage: false),
        findsOneWidget,
      );
      expect(find.text('Total charged', skipOffstage: false), findsWidgets);
      expect(
        find.textContaining('Tax on the product value', skipOffstage: false),
        findsOneWidget,
      );
    },
  );
}
