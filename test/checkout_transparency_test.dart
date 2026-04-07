import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:zora_walat/l10n/app_localizations.dart';

void main() {
  testWidgets('Phase 1 checkout transparency strings (en)', (tester) async {
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
              body: Column(
                children: [
                  Text(l10n.checkoutAirtimeAmountLine(r'$5.00')),
                  Text(l10n.phase1ValidityDependsOnOperator),
                  Text(l10n.rechargeReviewServerPricingNote),
                  Text(l10n.telecomCheckoutAirtimeRowLabel),
                ],
              ),
            );
          },
        ),
      ),
    );

    expect(find.textContaining('Send'), findsOneWidget);
    expect(find.textContaining('USD'), findsWidgets);
    expect(find.textContaining('Airtime'), findsWidgets);
  });
}
