import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/app_router.dart';
import '../../../l10n/app_localizations.dart';
import '../../orders/domain/order_center_row.dart';
import '../../payments/domain/customer_order_tracking.dart';
import '../order_support_summary.dart';

/// Premium assistance strip: help center + copy support packet.
class OrderSupportActionBar extends StatelessWidget {
  const OrderSupportActionBar({
    super.key,
    required this.l10n,
    required this.row,
    required this.paymentLabel,
    required this.fulfillmentLabel,
  });

  final AppLocalizations l10n;
  final OrderCenterRow row;
  final String paymentLabel;
  final String fulfillmentLabel;

  Future<void> _copyPacket(BuildContext context) async {
    final locale = Localizations.localeOf(context).toString();
    final text = OrderSupportSummary.buildPacket(
      l10n,
      row,
      paymentLabel: paymentLabel,
      fulfillmentLabel: fulfillmentLabel,
      localeName: locale,
    );
    await Clipboard.setData(ClipboardData(text: text));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(l10n.supportPacketCopied),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Material(
      color: t.colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(
                  Icons.support_agent_rounded,
                  color: t.colorScheme.primary,
                  size: 22,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    l10n.supportNeedHelp,
                    style: t.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => context.push(AppRoutePaths.helpCenter),
                    icon: const Icon(Icons.menu_book_outlined, size: 20),
                    label: Text(l10n.supportOpenHelpCenter),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.tonalIcon(
                    onPressed: () => _copyPacket(context),
                    icon: const Icon(Icons.copy_all_rounded, size: 20),
                    label: Text(l10n.supportCopyPacket),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Context-aware guidance for orders that need extra clarity (no panic tone).
class OrderSituationAssistanceCard extends StatelessWidget {
  const OrderSituationAssistanceCard({
    super.key,
    required this.l10n,
    required this.tracking,
  });

  final AppLocalizations l10n;
  final CustomerOrderTracking tracking;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final copy = _escalationCopy(l10n, tracking, t.colorScheme);
    if (copy == null) return const SizedBox.shrink();

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 280),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      child: Container(
        key: ValueKey(copy.title),
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              copy.tint.withValues(alpha: 0.14),
              t.colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
            ],
          ),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: copy.tint.withValues(alpha: 0.28)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: copy.tint.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(copy.icon, color: copy.tint, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        copy.title,
                        style: t.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        copy.body,
                        style: t.textTheme.bodyMedium?.copyWith(
                          height: 1.45,
                          color: t.colorScheme.onSurface.withValues(alpha: 0.88),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
              decoration: BoxDecoration(
                color: t.colorScheme.surface.withValues(alpha: 0.55),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.north_east_rounded,
                    size: 18,
                    color: t.colorScheme.primary,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      copy.nextStep,
                      style: t.textTheme.bodySmall?.copyWith(
                        height: 1.45,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              l10n.supportReassuranceFooter,
              style: t.textTheme.bodySmall?.copyWith(
                height: 1.45,
                color: t.colorScheme.outline,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EscalationCopy {
  const _EscalationCopy({
    required this.title,
    required this.body,
    required this.nextStep,
    required this.icon,
    required this.tint,
  });

  final String title;
  final String body;
  final String nextStep;
  final IconData icon;
  final Color tint;
}

_EscalationCopy? _escalationCopy(
  AppLocalizations l10n,
  CustomerOrderTracking t,
  ColorScheme scheme,
) {
  switch (t.stage) {
    case CustomerTrackingStage.retrying:
      return _EscalationCopy(
        title: l10n.supportAssistRetryingTitle,
        body: l10n.supportAssistRetryingBody,
        nextStep: l10n.supportAssistRetryingNext,
        icon: Icons.autorenew_rounded,
        tint: scheme.tertiary,
      );
    case CustomerTrackingStage.delayed:
      return _EscalationCopy(
        title: l10n.supportAssistDelayedTitle,
        body: l10n.supportAssistDelayedBody,
        nextStep: l10n.supportAssistDelayedNext,
        icon: Icons.schedule_rounded,
        tint: scheme.secondary,
      );
    case CustomerTrackingStage.failed:
      return _EscalationCopy(
        title: l10n.supportAssistFailedTitle,
        body: l10n.supportAssistFailedBody,
        nextStep: l10n.supportAssistFailedNext,
        icon: Icons.support_agent_rounded,
        tint: scheme.error,
      );
    case CustomerTrackingStage.paymentConfirming:
      return _EscalationCopy(
        title: l10n.supportAssistPaymentConfirmTitle,
        body: l10n.supportAssistPaymentConfirmBody,
        nextStep: l10n.supportAssistPaymentConfirmNext,
        icon: Icons.verified_outlined,
        tint: scheme.primary,
      );
    case CustomerTrackingStage.sendingToOperator:
      return _EscalationCopy(
        title: l10n.supportAssistOperatorTitle,
        body: l10n.supportAssistOperatorBody,
        nextStep: l10n.supportAssistOperatorNext,
        icon: Icons.send_rounded,
        tint: scheme.primary,
      );
    case CustomerTrackingStage.verifying:
      return _EscalationCopy(
        title: l10n.supportAssistVerifyingTitle,
        body: l10n.supportAssistVerifyingBody,
        nextStep: l10n.supportAssistVerifyingNext,
        icon: Icons.verified_user_outlined,
        tint: scheme.secondary,
      );
    case CustomerTrackingStage.orderCancelled:
      return _EscalationCopy(
        title: l10n.supportAssistCancelledTitle,
        body: l10n.supportAssistCancelledBody,
        nextStep: l10n.supportAssistCancelledNext,
        icon: Icons.cancel_outlined,
        tint: scheme.outline,
      );
    case CustomerTrackingStage.delivered:
    case CustomerTrackingStage.preparingTopup:
    case CustomerTrackingStage.paymentReceived:
      return null;
  }
}
