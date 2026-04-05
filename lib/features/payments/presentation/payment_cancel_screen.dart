import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/app_router.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/trust_strip.dart';

/// Shown when the user returns from Stripe Checkout without completing payment (`/cancel`).
class PaymentCancelScreen extends StatelessWidget {
  const PaymentCancelScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final cs = t.colorScheme;
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.cancelScreenTitle),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(
                child: Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: cs.secondary.withValues(alpha: 0.1),
                    border: Border.all(
                      color: cs.secondary.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Icon(
                    Icons.payments_outlined,
                    size: 42,
                    color: cs.secondary,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                l10n.cancelScreenLead,
                textAlign: TextAlign.center,
                style: t.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                l10n.cancelScreenBody,
                textAlign: TextAlign.center,
                style: t.textTheme.bodyMedium?.copyWith(
                  color: cs.onSurface.withValues(alpha: 0.88),
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 24),
              TrustStrip(compact: true),
              const SizedBox(height: 28),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: cs.primary.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: cs.primary.withValues(alpha: 0.22),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.savings_outlined, color: cs.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        l10n.paymentSafeBanner,
                        style: t.textTheme.bodySmall?.copyWith(height: 1.45),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              FilledButton(
                onPressed: () => context.go(AppRoutePaths.hub),
                child: Text(l10n.cancelBackHome),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
