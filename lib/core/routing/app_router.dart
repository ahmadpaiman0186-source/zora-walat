import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../features/calling/calling_placeholder_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/home/presentation/main_home_screen.dart';
import '../../features/onboarding/presentation/language_selection_screen.dart';
import '../../features/onboarding/presentation/splash_screen.dart';
import '../../features/recharge/presentation/recharge_review_screen.dart';
import '../../features/recharge/presentation/recharge_screen.dart';
import '../../features/telecom/domain/telecom_order.dart';
import '../../features/telecom/presentation/checkout_screen.dart';
import '../../features/wallet/presentation/wallet_screen.dart';
import '../../models/recharge_draft.dart';

abstract final class AppRoutePaths {
  static const splash = '/splash';
  static const language = '/language';
  static const home = '/';
  static const rechargeReview = '/recharge/review';
  static const hub = '/hub';
  static const recharge = '/recharge';
  static const wallet = '/wallet';
  static const calling = '/calling';
  static const telecom = '/telecom';
  static const checkout = '/checkout';
}

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createAppRouter() {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: AppRoutePaths.splash,
    routes: [
      GoRoute(
        path: AppRoutePaths.splash,
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.language,
        name: 'language',
        builder: (context, state) => const LanguageSelectionScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.home,
        name: 'home',
        builder: (context, state) => const RechargeScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.rechargeReview,
        name: 'rechargeReview',
        builder: (context, state) {
          final draft = state.extra as RechargeDraft?;
          final l10n = AppLocalizations.of(context);
          if (draft == null) {
            return Scaffold(body: Center(child: Text(l10n.missingOrder)));
          }
          return RechargeReviewScreen(draft: draft);
        },
      ),
      GoRoute(
        path: AppRoutePaths.hub,
        name: 'hub',
        builder: (context, state) => const MainHomeScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.recharge,
        name: 'recharge',
        builder: (context, state) => const RechargeScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.wallet,
        name: 'wallet',
        builder: (context, state) => const WalletScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.calling,
        name: 'calling',
        builder: (context, state) => const CallingPlaceholderScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.telecom,
        name: 'telecom',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.checkout,
        name: 'checkout',
        builder: (context, state) {
          final order = state.extra as TelecomOrder?;
          if (order == null) {
            final l10n = AppLocalizations.of(context);
            return Scaffold(body: Center(child: Text(l10n.missingOrder)));
          }
          return CheckoutScreen(order: order);
        },
      ),
    ],
  );
}
