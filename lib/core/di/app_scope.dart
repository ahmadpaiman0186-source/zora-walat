import 'package:flutter/widgets.dart';

import '../onboarding/onboarding_prefs.dart';
import '../../services/auth_api_service.dart';
import '../../services/payment_service.dart';
import '../../features/telecom/data/telecom_service.dart';
import '../../features/transactions/data/transaction_log_store.dart';
import '../../services/api_service.dart';
import '../auth/auth_session.dart';

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
    required this.apiService,
    required this.authApiService,
    required super.child,
  }) : super(notifier: authSession);

  final OnboardingPrefs onboardingPrefs;
  final PaymentService paymentService;
  final TelecomService telecomService;
  final TransactionLogStore transactionLog;
  final ApiService apiService;
  final AuthApiService authApiService;

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
        apiService != oldWidget.apiService ||
        authApiService != oldWidget.authApiService ||
        super.updateShouldNotify(oldWidget);
  }
}
