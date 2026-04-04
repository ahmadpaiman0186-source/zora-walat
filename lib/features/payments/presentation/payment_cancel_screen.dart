import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/app_router.dart';

/// Shown when the user returns from Stripe Checkout without completing payment (`/cancel`).
class PaymentCancelScreen extends StatelessWidget {
  const PaymentCancelScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final cs = t.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout cancelled'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 8),
              Align(
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: cs.outline.withValues(alpha: 0.12),
                    border: Border.all(
                      color: cs.outline.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Icon(
                    Icons.payments_outlined,
                    size: 40,
                    color: cs.onSurface.withValues(alpha: 0.75),
                  ),
                ),
              ),
              const SizedBox(height: 28),
              Text(
                'Your payment was not completed',
                textAlign: TextAlign.center,
                style: t.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'No charge has been made. You can safely return to the app and try again whenever you are ready.',
                textAlign: TextAlign.center,
                style: t.textTheme.bodyMedium?.copyWith(
                  color: cs.onSurface.withValues(alpha: 0.85),
                  height: 1.45,
                ),
              ),
              const Spacer(),
              FilledButton(
                onPressed: () => context.go(AppRoutePaths.hub),
                child: const Text('Go Home'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
