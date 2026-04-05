import 'package:flutter/widgets.dart';

import '../onboarding/onboarding_prefs.dart';
import '../../services/auth_api_service.dart';
import '../../services/payment_service.dart';
import '../../features/telecom/data/telecom_service.dart';
import '../../features/orders/data/local_order_history_store.dart';
import '../../features/transactions/data/transaction_log_store.dart';
import '../../services/api_service.dart';
import '../auth/auth_session.dart';
import '../notifications/app_notification_hub.dart';
import '../notifications/in_app_notification_store.dart';

/// Root dependency scope. [AuthSession] is the [InheritedNotifier] notifier so
/// sign-in/out rebuilds dependents.
class AppScope extends InheritedNotifier<AuthSession> {
  const AppScope({
    super.key,
    required AuthSession authSession,
    required this.onboardingPrefs,
    required this.paymentService,
    required this.telecomService,
    required this.transactionLog,
    required this.orderHistory,
    required this.apiService,
    required this.authApiService,
    required this.notificationStore,
    required this.notificationHub,
    required super.child,
  }) : super(notifier: authSession);

  final OnboardingPrefs onboardingPrefs;
  final PaymentService paymentService;
  final TelecomService telecomService;
  final TransactionLogStore transactionLog;
  final LocalOrderHistoryStore orderHistory;
  final ApiService apiService;
  final AuthApiService authApiService;
  final InAppNotificationStore notificationStore;
  final AppNotificationHub notificationHub;

  static AppScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope not found in tree');
    return scope!;
  }

  static AuthSession authSessionOf(BuildContext context) {
    final n = of(context).notifier;
    assert(n != null, 'AuthSession missing');
    return n!;
  }

  @override
  bool updateShouldNotify(covariant AppScope oldWidget) {
    return onboardingPrefs != oldWidget.onboardingPrefs ||
        paymentService != oldWidget.paymentService ||
        telecomService != oldWidget.telecomService ||
        transactionLog != oldWidget.transactionLog ||
        orderHistory != oldWidget.orderHistory ||
        apiService != oldWidget.apiService ||
        authApiService != oldWidget.authApiService ||
        notificationStore != oldWidget.notificationStore ||
        notificationHub != oldWidget.notificationHub ||
        super.updateShouldNotify(oldWidget);
  }
}
