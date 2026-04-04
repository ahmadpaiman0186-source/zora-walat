import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../l10n/app_localizations.dart';

/// Minimal premium splash → `/language` or `/` based on [OnboardingPrefs].
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _logoCtl;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _logoCtl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _fade = CurvedAnimation(parent: _logoCtl, curve: Curves.easeOut);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      unawaited(_logoCtl.forward());
      final onboarding = AppScope.of(context).onboardingPrefs;
      Timer(const Duration(milliseconds: 2200), () {
        if (!mounted) return;
        if (onboarding.hasCompletedLanguageOnboarding) {
          context.go(AppRoutePaths.recharge);
        } else {
          context.go(AppRoutePaths.language);
        }
      });
    });
  }

  @override
  void dispose() {
    _logoCtl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0A0E12), Color(0xFF0F1419), Color(0xFF121A22)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: FadeTransition(
              opacity: _fade,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: t.colorScheme.primary.withValues(alpha: 0.35),
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: t.colorScheme.primary.withValues(alpha: 0.12),
                          blurRadius: 32,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: Icon(
                      Icons.bolt_rounded,
                      size: 44,
                      color: t.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 28),
                  Text(
                    l10n.appTitle,
                    style: t.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 48),
                    child: Text(
                      l10n.splashTagline,
                      textAlign: TextAlign.center,
                      style: t.textTheme.bodyMedium?.copyWith(
                        color: t.colorScheme.outline,
                        height: 1.35,
                      ),
                    ),
                  ),
                  const SizedBox(height: 48),
                  SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: t.colorScheme.primary.withValues(alpha: 0.85),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
