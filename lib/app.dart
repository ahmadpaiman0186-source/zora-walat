import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'core/auth/auth_session.dart';
import 'core/di/app_scope.dart';
import 'core/onboarding/onboarding_prefs.dart';
import 'core/locale/locale_controller.dart';
import 'core/locale/locale_scope.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';
import 'services/auth_api_service.dart';
import 'services/payment_service.dart';
import 'features/telecom/data/telecom_service.dart';
import 'features/orders/data/local_order_history_store.dart';
import 'features/transactions/data/transaction_log_store.dart';
import 'l10n/app_localizations.dart';
import 'services/api_service.dart';
import 'core/notifications/app_notification_hub.dart';
import 'core/notifications/in_app_notification_store.dart';
import 'core/notifications/local_notification_service.dart';
import 'core/push/notification_push_coordinator.dart';

class ZoraWalatApp extends StatefulWidget {
  const ZoraWalatApp({
    super.key,
    required this.localeController,
    required this.onboardingPrefs,
    required this.authSession,
    required this.authApiService,
    required this.paymentService,
    required this.telecomService,
    required this.transactionLog,
    required this.orderHistory,
    required this.apiService,
    required this.notificationStore,
    required this.notificationHub,
  });

  final LocaleController localeController;
  final OnboardingPrefs onboardingPrefs;
  final AuthSession authSession;
  final AuthApiService authApiService;
  final PaymentService paymentService;
  final TelecomService telecomService;
  final TransactionLogStore transactionLog;
  final LocalOrderHistoryStore orderHistory;
  final ApiService apiService;
  final InAppNotificationStore notificationStore;
  final AppNotificationHub notificationHub;

  @override
  State<ZoraWalatApp> createState() => _ZoraWalatAppState();
}

class _ZoraWalatAppState extends State<ZoraWalatApp> {
  /// Single instance so locale changes do not replace [GoRouter] and dispose routes.
  late final GoRouter _router = createAppRouter();
  late final NotificationPushCoordinator _push = NotificationPushCoordinator(
    api: widget.apiService,
    hub: widget.notificationHub,
    auth: widget.authSession,
    store: widget.notificationStore,
    onNavigate: (loc) => _router.go(loc),
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      LocalNotificationService.instance.init(onNavigate: _router.go);
      _push.start();
    });
  }

  @override
  void dispose() {
    _push.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.localeController,
      builder: (context, _) {
        return LocaleScope(
          locale: widget.localeController.locale,
          controller: widget.localeController,
          child: AppScope(
            authSession: widget.authSession,
            onboardingPrefs: widget.onboardingPrefs,
            paymentService: widget.paymentService,
            telecomService: widget.telecomService,
            transactionLog: widget.transactionLog,
            orderHistory: widget.orderHistory,
            apiService: widget.apiService,
            authApiService: widget.authApiService,
            notificationStore: widget.notificationStore,
            notificationHub: widget.notificationHub,
            child: MaterialApp.router(
              onGenerateTitle: (ctx) => AppLocalizations.of(ctx).appTitle,
              debugShowCheckedModeBanner: false,
              locale: widget.localeController.locale,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              theme: AppTheme.dark(locale: widget.localeController.locale),
              themeMode: ThemeMode.dark,
              routerConfig: _router,
            ),
          ),
        );
      },
    );
  }
}
