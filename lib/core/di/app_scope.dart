import 'package:flutter/widgets.dart';

import '../onboarding/onboarding_prefs.dart';
import '../../features/payments/data/payment_service.dart';
import '../../features/telecom/data/telecom_service.dart';
import '../../features/transactions/data/transaction_log_store.dart';
import '../../services/api_service.dart';

/// Root dependency scope for services that screens resolve via [of].
class AppScope extends InheritedWidget {
  const AppScope({
    super.key,
    required this.onboardingPrefs,
    required this.paymentService,
    required this.telecomService,
    required this.transactionLog,
    required this.apiService,
    required super.child,
  });

  final OnboardingPrefs onboardingPrefs;
  final PaymentService paymentService;
  final TelecomService telecomService;
  final TransactionLogStore transactionLog;
  final ApiService apiService;

  static AppScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope not found in tree');
    return scope!;
  }

  @override
  bool updateShouldNotify(covariant AppScope oldWidget) {
    return onboardingPrefs != oldWidget.onboardingPrefs ||
        paymentService != oldWidget.paymentService ||
        telecomService != oldWidget.telecomService ||
        transactionLog != oldWidget.transactionLog ||
        apiService != oldWidget.apiService;
  }
}
