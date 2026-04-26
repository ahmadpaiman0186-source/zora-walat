import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_session.dart';
import '../../l10n/app_localizations.dart';
import '../../features/calling/calling_placeholder_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/home/presentation/main_home_screen.dart';
import '../../features/landing/presentation/landing_screen.dart';
import '../../features/onboarding/presentation/language_selection_screen.dart';
import '../../features/onboarding/presentation/splash_screen.dart';
import '../../features/orders/domain/order_center_row.dart';
import '../../features/orders/presentation/order_detail_screen.dart';
import '../../features/orders/presentation/order_history_screen.dart';
import '../../features/payments/presentation/payment_cancel_screen.dart';
import '../../features/payments/presentation/success_screen.dart';
import '../../features/recharge/presentation/recharge_review_screen.dart';
import '../../features/recharge/presentation/recharge_screen.dart';
import '../../features/telecom/domain/telecom_order.dart';
import '../../features/telecom/presentation/checkout_screen.dart';
import '../../features/wallet/presentation/wallet_screen.dart';
import '../../features/auth/presentation/sign_in_screen.dart';
import '../../features/auth/presentation/otp_verify_screen.dart';
import '../../features/auth/presentation/sign_up_screen.dart';
import '../../features/loyalty/presentation/loyalty_hub_screen.dart';
import '../../features/referral/presentation/referral_center_screen.dart';
import '../../features/notifications/presentation/notification_inbox_screen.dart';
import '../../features/support/presentation/help_center_screen.dart';
import '../../models/recharge_draft.dart';

abstract final class AppRoutePaths {
  static const splash = '/splash';
  static const language = '/language';
  /// Public marketing landing (default web root).
  static const landing = '/';
  static const rechargeReview = '/recharge/review';
  static const hub = '/hub';
  static const recharge = '/recharge';
  static const wallet = '/wallet';
  static const calling = '/calling';
  static const telecom = '/telecom';
  static const checkout = '/checkout';
  static const signIn = '/sign-in';
  static const signInOtp = '/sign-in/code';
  static const signUp = '/sign-up';
  static const paymentSuccess = '/success';
  static const paymentCancel = '/cancel';
  static const orders = '/orders';
  static const loyalty = '/loyalty';
  static const referral = '/referral';
  static const notifications = '/notifications';
  static const helpCenter = '/help';
}

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

/// On web, honor the browser path for Stripe return URLs (`/success`, `/cancel`).
/// Root `/` loads the public [LandingScreen] (deploy-friendly home).
///
/// Stripe and some browsers may use a trailing slash (`/success/`). [GoRouter]
/// paths are registered without it — normalize so the route matches and the page
/// is not a blank unknown location.
String initialAppLocation() {
  if (!kIsWeb) return AppRoutePaths.splash;
  final u = Uri.base;
  var path = u.path;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.substring(0, path.length - 1);
  }
  if (path.isEmpty || path == '/') return AppRoutePaths.landing;
  if (u.hasQuery) return '$path?${u.query}';
  return path;
}

GoRouter createAppRouter({required AuthSession authSession}) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    refreshListenable: authSession,
    initialLocation: initialAppLocation(),
    redirect: (context, state) {
      var path = state.uri.path;
      if (path.length > 1 && path.endsWith('/')) {
        final trimmed = path.substring(0, path.length - 1);
        return '$trimmed${state.uri.hasQuery ? '?${state.uri.query}' : ''}';
      }
      if (!authSession.isAuthenticated) return null;
      if (path == AppRoutePaths.splash ||
          path == AppRoutePaths.landing ||
          path == AppRoutePaths.signIn ||
          path == AppRoutePaths.signInOtp) {
        return AppRoutePaths.hub;
      }
      return null;
    },
    errorBuilder: (context, state) {
      final t = Theme.of(context);
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Route not found: ${state.uri}\n'
              'If you returned from payment, open /success with query session_id & order_id.',
              style: t.textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    },
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
        path: AppRoutePaths.landing,
        name: 'landing',
        builder: (context, state) => const LandingScreen(),
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
      GoRoute(
        path: AppRoutePaths.signIn,
        name: 'signIn',
        builder: (context, state) => const SignInScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.signInOtp,
        name: 'signInOtp',
        builder: (context, state) {
          final email = state.uri.queryParameters['email']?.trim() ?? '';
          if (email.isEmpty) {
            return const SignInScreen();
          }
          final prior = state.extra;
          final priorMessage = prior is String ? prior : null;
          return OtpVerifyScreen(
            email: email,
            priorOtpSendMessage: priorMessage,
          );
        },
      ),
      GoRoute(
        path: AppRoutePaths.signUp,
        name: 'signUp',
        builder: (context, state) => const SignUpScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.paymentSuccess,
        name: 'paymentSuccess',
        builder: (context, state) {
          final q = state.uri.queryParameters;
          return SuccessScreen(
            checkoutSessionId: q['session_id'] ?? q['sessionId'],
            orderReference: q['order_id'] ?? q['orderId'],
          );
        },
      ),
      GoRoute(
        path: AppRoutePaths.paymentCancel,
        name: 'paymentCancel',
        builder: (context, state) => const PaymentCancelScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.orders,
        name: 'orders',
        builder: (context, state) => const OrderHistoryScreen(),
        routes: [
          GoRoute(
            path: ':orderId',
            name: 'orderDetail',
            builder: (context, state) {
              final id = state.pathParameters['orderId'] ?? '';
              final extra = state.extra;
              return OrderDetailScreen(
                orderId: id,
                initialRow: extra is OrderCenterRow ? extra : null,
              );
            },
          ),
        ],
      ),
      GoRoute(
        path: AppRoutePaths.loyalty,
        name: 'loyalty',
        builder: (context, state) {
          final tab =
              int.tryParse(state.uri.queryParameters['tab'] ?? '') ?? 0;
          return LoyaltyHubScreen(initialTabIndex: tab.clamp(0, 1));
        },
      ),
      GoRoute(
        path: AppRoutePaths.referral,
        name: 'referral',
        builder: (context, state) => const ReferralCenterScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.notifications,
        name: 'notifications',
        builder: (context, state) => const NotificationInboxScreen(),
      ),
      GoRoute(
        path: AppRoutePaths.helpCenter,
        name: 'helpCenter',
        builder: (context, state) => const HelpCenterScreen(),
      ),
    ],
  );
}
