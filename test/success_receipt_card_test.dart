import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:zora_walat/features/payments/presentation/success_receipt_card.dart';
import 'package:zora_walat/l10n/app_localizations.dart';
import 'package:zora_walat/models/checkout_pricing_breakdown.dart';

void main() {
  testWidgets(
    'SuccessReceiptCard shows four-line breakdown; total row is not product value',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          locale: const Locale('en'),
          home: Builder(
            builder: (context) {
              final l10n = AppLocalizations.of(context);
              return Scaffold(
                body: SuccessReceiptCard(
                  l10n: l10n,
                  orderRef: 'ord_test',
                  paymentLabel: 'Paid',
                  fulfillmentLabel: 'Progress',
                  pricingBreakdown: const CheckoutPricingBreakdown(
                    productValueUsdCents: 500,
                    governmentTaxUsdCents: 10,
                    zoraServiceFeeUsdCents: 15,
                    totalUsdCents: 525,
                  ),
                ),
              );
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Product value'), findsOneWidget);
      expect(find.text('Tax (sender jurisdiction)'), findsOneWidget);
      expect(find.text('Zora-Walat service fee'), findsOneWidget);
      expect(find.text('Total charged'), findsOneWidget);
      expect(find.textContaining('5.00'), findsWidgets);
      expect(find.textContaining('5.25'), findsOneWidget);
    },
  );

  testWidgets(
    'SuccessReceiptCard fallback: charged total only when breakdown missing',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          locale: const Locale('en'),
          home: Builder(
            builder: (context) {
              final l10n = AppLocalizations.of(context);
              return Scaffold(
                body: SuccessReceiptCard(
                  l10n: l10n,
                  orderRef: 'ord_x',
                  paymentLabel: 'Paid',
                  fulfillmentLabel: 'Progress',
                  orderChargedTotalCents: 525,
                ),
              );
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Product value'), findsNothing);
      expect(find.text('Total charged'), findsOneWidget);
      expect(find.textContaining('5.25'), findsOneWidget);
    },
  );
}
