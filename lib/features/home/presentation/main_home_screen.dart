import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/widgets/language_sheet.dart';
import '../../../l10n/app_localizations.dart';

/// Hub: entry to recharge, wallet, legacy telecom hub, international placeholder.
class MainHomeScreen extends StatelessWidget {
  const MainHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final auth = AppScope.authSessionOf(context);
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
                      Text('Zora-Walat', style: t.textTheme.headlineSmall),
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
                ListenableBuilder(
                  listenable: AppScope.of(context).notificationStore,
                  builder: (context, _) {
                    final unread =
                        AppScope.of(context).notificationStore.unreadCount();
                    final label = unread > 9 ? '9+' : '$unread';
                    return Badge(
                      isLabelVisible: unread > 0,
                      backgroundColor: t.colorScheme.primary,
                      textColor: t.colorScheme.onPrimary,
                      label: Text(
                        label,
                        style: t.textTheme.labelSmall?.copyWith(
                          color: t.colorScheme.onPrimary,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      child: IconButton(
                        tooltip: l10n.notifHubTooltip,
                        icon: const Icon(Icons.notifications_outlined),
                        onPressed: () =>
                            context.push(AppRoutePaths.notifications),
                      ),
                    );
                  },
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
              icon: Icons.person_outline_rounded,
              title: l10n.authAccountTileTitle,
              subtitle: auth.isAuthenticated
                  ? l10n.authAccountTileSignedInSub
                  : l10n.authAccountTileSignedOutSub,
              onTap: () async {
                if (auth.isAuthenticated) {
                  final rt = auth.refreshToken;
                  if (rt != null && rt.isNotEmpty) {
                    try {
                      await AppScope.of(context).authApiService.logout(
                            refreshToken: rt,
                          );
                    } catch (_) {}
                  }
                  await auth.clear();
                } else if (context.mounted) {
                  context.push(AppRoutePaths.signIn);
                }
              },
            ),
            _Tile(
              icon: Icons.phone_android_rounded,
              title: l10n.hubTileRechargeTitle,
              subtitle: l10n.hubTileRechargeSub,
              onTap: () => context.go(AppRoutePaths.recharge),
            ),
            _Tile(
              icon: Icons.receipt_long_rounded,
              title: l10n.hubTileOrdersTitle,
              subtitle: l10n.hubTileOrdersSub,
              onTap: () => context.push(AppRoutePaths.orders),
            ),
            _Tile(
              icon: Icons.groups_2_outlined,
              title: l10n.hubTileLoyaltyTitle,
              subtitle: l10n.hubTileLoyaltySub,
              onTap: () => context.push(AppRoutePaths.loyalty),
            ),
            _Tile(
              icon: Icons.card_giftcard_outlined,
              title: l10n.hubTileReferralTitle,
              subtitle: l10n.hubTileReferralSub,
              onTap: () => context.push(AppRoutePaths.referral),
            ),
            _Tile(
              icon: Icons.support_agent_outlined,
              title: l10n.hubTileHelpTitle,
              subtitle: l10n.hubTileHelpSub,
              onTap: () => context.push(AppRoutePaths.helpCenter),
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
        borderRadius: BorderRadius.circular(20),
        shadowColor: Colors.black.withValues(alpha: 0.2),
        elevation: 0,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: t.colorScheme.outline.withValues(alpha: 0.12),
              ),
            ),
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
