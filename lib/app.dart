import 'package:flutter/material.dart';

import 'core/di/app_scope.dart';
import 'core/onboarding/onboarding_prefs.dart';
import 'core/locale/locale_controller.dart';
import 'core/locale/locale_scope.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/payments/data/payment_service.dart';
import 'features/telecom/data/telecom_service.dart';
import 'features/transactions/data/transaction_log_store.dart';
import 'l10n/app_localizations.dart';
import 'services/api_service.dart';

class ZoraWalatApp extends StatelessWidget {
  const ZoraWalatApp({
    super.key,
    required this.localeController,
    required this.onboardingPrefs,
    required this.paymentService,
    required this.telecomService,
    required this.transactionLog,
    required this.apiService,
  });

  final LocaleController localeController;
  final OnboardingPrefs onboardingPrefs;
  final PaymentService paymentService;
  final TelecomService telecomService;
  final TransactionLogStore transactionLog;
  final ApiService apiService;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: localeController,
      builder: (context, _) {
        return LocaleScope(
          locale: localeController.locale,
          controller: localeController,
          child: AppScope(
            onboardingPrefs: onboardingPrefs,
            paymentService: paymentService,
            telecomService: telecomService,
            transactionLog: transactionLog,
            apiService: apiService,
            child: MaterialApp.router(
              onGenerateTitle: (ctx) => AppLocalizations.of(ctx).appTitle,
              debugShowCheckedModeBanner: false,
              locale: localeController.locale,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              theme: AppTheme.dark(locale: localeController.locale),
              themeMode: ThemeMode.dark,
              routerConfig: createAppRouter(),
            ),
          ),
        );
      },
    );
  }
}
