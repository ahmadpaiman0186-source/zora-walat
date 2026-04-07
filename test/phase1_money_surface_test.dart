import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:zora_walat/l10n/app_localizations.dart';

/// Focused Phase 1 money-surface copy: failure, delay, USD-only, disabled scope.
void main() {
  testWidgets('delayed and failed fulfillment messaging (en)', (tester) async {
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
                  Text(l10n.supportAssistDelayedTitle),
                  Text(l10n.supportAssistDelayedBody),
                  Text(l10n.supportAssistFailedTitle),
                  Text(l10n.supportAssistFailedBody),
                ],
              ),
            );
          },
        ),
      ),
    );

    expect(find.textContaining('Still catching'), findsOneWidget);
    expect(find.textContaining('reviewing with care'), findsOneWidget);
    expect(find.textContaining('payment'), findsWidgets);
  });

  testWidgets('USD-only and Phase 1 airtime-only disclosure (en)', (tester) async {
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
                  Text(l10n.phase1OnlyAirtimeSnack),
                  Text(l10n.checkoutPricingUsdServerNote),
                ],
              ),
            );
          },
        ),
      ),
    );

    expect(find.textContaining('Phase 1'), findsOneWidget);
    expect(find.textContaining('USD'), findsWidgets);
  });

  testWidgets('operator-dependent validity wording (en)', (tester) async {
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
            return Scaffold(body: Text(l10n.phase1ValidityDependsOnOperator));
          },
        ),
      ),
    );

    expect(find.textContaining('operator'), findsOneWidget);
  });
}
