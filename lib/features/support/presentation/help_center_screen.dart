import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/app_router.dart';
import '../../../l10n/app_localizations.dart';

/// Calm, sectioned help — premium telecom product tone.
class HelpCenterScreen extends StatelessWidget {
  const HelpCenterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.helpCenterTitle),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 36),
        children: [
          Text(
            l10n.helpCenterSubtitle,
            style: t.textTheme.bodyMedium?.copyWith(
              color: t.colorScheme.outline,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 22),
          _PremiumHelpCard(
            icon: Icons.verified_user_outlined,
            title: l10n.helpSectionPaymentTitle,
            body: l10n.helpSectionPaymentBody,
          ),
          _PremiumHelpCard(
            icon: Icons.schedule_outlined,
            title: l10n.helpSectionDeliveryTitle,
            body: l10n.helpSectionDeliveryBody,
          ),
          _PremiumHelpCard(
            icon: Icons.autorenew_rounded,
            title: l10n.helpSectionRetryTitle,
            body: l10n.helpSectionRetryBody,
          ),
          _PremiumHelpCard(
            icon: Icons.timeline_outlined,
            title: l10n.helpSectionTrackingTitle,
            body: l10n.helpSectionTrackingBody,
          ),
          _PremiumHelpCard(
            icon: Icons.groups_2_outlined,
            title: l10n.helpSectionLoyaltyTitle,
            body: l10n.helpSectionLoyaltyBody,
            child: Padding(
              padding: const EdgeInsets.only(top: 14),
              child: Align(
                alignment: Alignment.centerLeft,
                child: FilledButton.tonalIcon(
                  onPressed: () =>
                      context.push('${AppRoutePaths.loyalty}?tab=0'),
                  icon: const Icon(Icons.emoji_events_outlined, size: 20),
                  label: Text(l10n.helpOpenLoyalty),
                ),
              ),
            ),
          ),
          _PremiumHelpCard(
            icon: Icons.forum_outlined,
            title: l10n.helpSectionContactTitle,
            body: l10n.helpSectionContactBody,
          ),
        ],
      ),
    );
  }
}

class _PremiumHelpCard extends StatelessWidget {
  const _PremiumHelpCard({
    required this.icon,
    required this.title,
    required this.body,
    this.child,
  });

  final IconData icon;
  final String title;
  final String body;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Material(
        color: t.colorScheme.surfaceContainerHighest.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(22),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: t.colorScheme.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(icon, color: t.colorScheme.primary, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      title,
                      style: t.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        height: 1.25,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                body,
                style: t.textTheme.bodyMedium?.copyWith(
                  height: 1.5,
                  color: t.colorScheme.onSurface.withValues(alpha: 0.9),
                ),
              ),
              ?child,
            ],
          ),
        ),
      ),
    );
  }
}
