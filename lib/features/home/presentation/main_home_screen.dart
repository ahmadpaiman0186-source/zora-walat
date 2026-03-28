import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/app_config.dart';
import '../../../core/widgets/language_sheet.dart';
import '../../../l10n/app_localizations.dart';

/// Hub: entry to recharge, wallet, legacy telecom hub, international placeholder.
class MainHomeScreen extends StatelessWidget {
  const MainHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(AppConfig.appName, style: t.textTheme.headlineSmall),
                      const SizedBox(height: 8),
                      Text(
                        l10n.hubSubtitle,
                        style: t.textTheme.bodyMedium?.copyWith(
                          color: t.colorScheme.outline,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: l10n.language,
                  icon: const Icon(Icons.language_rounded),
                  onPressed: () => showLanguageSheet(context),
                ),
              ],
            ),
            const SizedBox(height: 28),
            _Tile(
              icon: Icons.phone_android_rounded,
              title: l10n.hubTileRechargeTitle,
              subtitle: l10n.hubTileRechargeSub,
              onTap: () => context.go('/'),
            ),
            _Tile(
              icon: Icons.account_balance_wallet_outlined,
              title: l10n.hubTileWalletTitle,
              subtitle: l10n.hubTileWalletSub,
              onTap: () => context.push('/wallet'),
            ),
            _Tile(
              icon: Icons.call_rounded,
              title: l10n.hubTileCallingTitle,
              subtitle: l10n.hubTileCallingSub,
              onTap: () => context.push('/calling'),
            ),
            _Tile(
              icon: Icons.dashboard_customize_outlined,
              title: l10n.hubTileLegacyTitle,
              subtitle: l10n.hubTileLegacySub,
              onTap: () => context.push('/telecom'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: t.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                Icon(icon, size: 32, color: t.colorScheme.primary),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: t.textTheme.titleMedium),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: t.textTheme.bodySmall?.copyWith(
                          color: t.colorScheme.outline,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, color: t.colorScheme.outline),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
