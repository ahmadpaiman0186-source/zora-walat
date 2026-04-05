import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/auth/unauthorized_exception.dart';
import '../../../core/di/app_scope.dart';
import '../../../l10n/app_localizations.dart';

/// Premium referral hub: code, trust copy, stats, and safe history (`/api/referral/*`).
class ReferralCenterScreen extends StatefulWidget {
  const ReferralCenterScreen({super.key});

  @override
  State<ReferralCenterScreen> createState() => _ReferralCenterScreenState();
}

class _ReferralCenterScreenState extends State<ReferralCenterScreen> {
  Map<String, dynamic>? _me;
  Map<String, dynamic>? _history;
  String? _error;
  bool _busy = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = AppScope.of(context).apiService;
      final results = await Future.wait([
        api.getReferralMe(),
        api.getReferralHistory(),
      ]);
      if (!mounted) return;
      setState(() {
        _me = results[0];
        _history = results[1];
      });
    } on UnauthorizedException {
      if (!mounted) return;
      setState(() => _error = l10n.authRequiredMessage);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _copy(String label, String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(label), behavior: SnackBarBehavior.floating),
    );
  }

  String _detailLine(AppLocalizations l10n, String? status, String? code) {
    if (status == 'pending') return l10n.referralPendingHint;
    if (status == 'completed') return l10n.referralCompletedHint;
    if (status == 'rewarded') return l10n.referralRewardedHint;
    if (status == 'rejected') {
      switch (code) {
        case 'budget_full':
          return l10n.referralRejectedDetailBudget;
        case 'weekly_invite_cap':
          return l10n.referralRejectedDetailWeeklyCap;
        case 'lifetime_invite_cap':
          return l10n.referralRejectedDetailLifetimeCap;
        case 'not_eligible':
          return l10n.referralRejectedDetailNotEligible;
        default:
          return l10n.referralRejectedDetailGeneric;
      }
    }
    return '';
  }

  String _statusLabel(AppLocalizations l10n, String? s) {
    switch (s) {
      case 'completed':
        return l10n.referralStatusCompleted;
      case 'rewarded':
        return l10n.referralStatusRewarded;
      case 'rejected':
        return l10n.referralStatusRejected;
      default:
        return l10n.referralStatusPending;
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar.large(
            title: Text(l10n.referralCenterTitle),
            actions: [
              IconButton(
                tooltip: l10n.refresh,
                onPressed: _busy ? null : _load,
                icon: _busy
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.refresh_rounded),
              ),
            ],
          ),
          if (_error != null)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
                child: _PremiumCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _error!,
                        style: t.textTheme.bodyMedium?.copyWith(
                          color: t.colorScheme.secondary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      FilledButton.tonal(
                        onPressed: _load,
                        child: Text(l10n.refresh),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (_busy && _me == null)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_me != null) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 12),
                child: Text(
                  l10n.referralCenterSubtitle,
                  style: t.textTheme.bodyLarge?.copyWith(
                    color: t.colorScheme.outline,
                    height: 1.35,
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: _PremiumCard(
                  accent: t.colorScheme.primary.withValues(alpha: 0.15),
                  child: Row(
                    children: [
                      Icon(
                        Icons.verified_user_outlined,
                        color: t.colorScheme.primary,
                        size: 28,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          l10n.referralTrustLine,
                          style: t.textTheme.bodyMedium?.copyWith(
                            height: 1.4,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (!(_me!['referralEnabled'] == true))
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                  child: _PremiumCard(
                    child: Text(
                      l10n.referralProgramPaused,
                      style: t.textTheme.bodyMedium,
                    ),
                  ),
                ),
              ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: _StatMini(
                        label: l10n.referralStatsInvited,
                        value:
                            '${(_me!['stats'] as Map?)?['totalInvited'] ?? 0}',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _StatMini(
                        label: l10n.referralStatsSuccessful,
                        value:
                            '${(_me!['stats'] as Map?)?['successfulReferrals'] ?? 0}',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _StatMini(
                        label: l10n.referralStatsEarned,
                        value: _formatUsd(
                          ((_me!['stats'] as Map?)?['rewardsEarnedUsd'] as num?)
                              ?.toDouble(),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: _PremiumCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.referralYourCode,
                        style: t.textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      SelectableText(
                        (_me!['referralCode'] as String?)?.isNotEmpty == true
                            ? _me!['referralCode'] as String
                            : '—',
                        style: t.textTheme.headlineSmall?.copyWith(
                          letterSpacing: 3,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          FilledButton.icon(
                            onPressed: (_me!['referralCode'] as String?)
                                        ?.isNotEmpty !=
                                    true
                                ? null
                                : () => _copy(
                                      l10n.referralCodeCopied,
                                      _me!['referralCode'] as String,
                                    ),
                            icon: const Icon(Icons.copy_rounded, size: 20),
                            label: Text(l10n.referralCopyCode),
                          ),
                          OutlinedButton.icon(
                            onPressed: (_me!['referralCode'] as String?)
                                        ?.isNotEmpty !=
                                    true
                                ? null
                                : () {
                                    final code = _me!['referralCode'] as String;
                                    _copy(
                                      l10n.referralInviteMessageCopied,
                                      l10n.referralInviteMessageTemplate(code),
                                    );
                                  },
                            icon: const Icon(Icons.chat_bubble_outline_rounded, size: 20),
                            label: Text(l10n.referralCopyInviteMessage),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 12),
                child: _PremiumCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.referralHowItWorksTitle,
                        style: t.textTheme.titleMedium,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        l10n.referralHowItWorksBody(
                          _formatUsd(
                            ((_me!['program'] as Map?)?['rewardPerReferralUsd'] as num?)
                                ?.toDouble(),
                          ),
                          _formatUsd(
                            ((_me!['program'] as Map?)?['minFirstOrderUsd'] as num?)
                                ?.toDouble(),
                          ),
                        ),
                        style: t.textTheme.bodyMedium?.copyWith(
                          height: 1.45,
                          color: t.colorScheme.outline,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        l10n.referralRewardRulesFootnote,
                        style: t.textTheme.bodySmall?.copyWith(
                          height: 1.4,
                          color: t.colorScheme.outline.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (_me!['program'] is Map &&
                (_me!['program'] as Map)['showWeeklyPoolHint'] == true)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: _PremiumCard(
                    accent: t.colorScheme.secondary.withValues(alpha: 0.12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.referralWeeklyFairTitle,
                          style: t.textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          l10n.referralWeeklyFairBody,
                          style: t.textTheme.bodyMedium?.copyWith(
                            height: 1.45,
                            color: t.colorScheme.outline,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 12),
                child: Text(
                  l10n.referralHistoryTitle,
                  style: t.textTheme.titleLarge,
                ),
              ),
            ),
            if (_history != null &&
                ((_history!['items'] as List?)?.isEmpty ?? true))
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: _PremiumCard(
                    child: Text(
                      l10n.referralHistoryEmpty,
                      style: t.textTheme.bodyMedium?.copyWith(
                        color: t.colorScheme.outline,
                      ),
                    ),
                  ),
                ),
              )
            else if (_history != null)
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, i) {
                    final items =
                        (_history!['items'] as List).cast<Map<String, dynamic>>();
                    final row = items[i];
                    final status = row['status'] as String?;
                    final detail = _detailLine(
                      l10n,
                      status,
                      row['statusDetailCode'] as String?,
                    );
                    return Padding(
                      padding: EdgeInsets.fromLTRB(24, 0, 24, i < items.length - 1 ? 10 : 24),
                      child: _PremiumCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    row['inviteeLabel'] as String? ?? '—',
                                    style: t.textTheme.titleSmall,
                                  ),
                                ),
                                _StatusChip(
                                  label: _statusLabel(l10n, status),
                                  status: status,
                                ),
                              ],
                            ),
                            if (status == 'rewarded' &&
                                row['rewardUsd'] != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                l10n.referralRewardAmountLine(
                                  _formatUsd((row['rewardUsd'] as num).toDouble()),
                                ),
                                style: t.textTheme.bodyMedium?.copyWith(
                                  color: t.colorScheme.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                            if (detail.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(
                                detail,
                                style: t.textTheme.bodySmall?.copyWith(
                                  height: 1.35,
                                  color: t.colorScheme.outline,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                  childCount:
                      (_history!['items'] as List?)?.length ?? 0,
                ),
              ),
          ],
        ],
      ),
    );
  }

  static String _formatUsd(double? v) {
    if (v == null) return '—';
    final s = v.toStringAsFixed(v == v.roundToDouble() ? 0 : 2);
    return '\$$s';
  }
}

class _PremiumCard extends StatelessWidget {
  const _PremiumCard({required this.child, this.accent});

  final Widget child;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        color: t.colorScheme.surfaceContainerHighest,
        border: Border.all(
          color: t.colorScheme.outline.withValues(alpha: 0.14),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.18),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
        gradient: accent != null
            ? LinearGradient(
                colors: [
                  accent!.withValues(alpha: 0.35),
                  t.colorScheme.surfaceContainerHighest,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
      ),
      child: child,
    );
  }
}

class _StatMini extends StatelessWidget {
  const _StatMini({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: t.colorScheme.surfaceContainerHighest.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: t.colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: t.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: t.textTheme.labelSmall?.copyWith(
              color: t.colorScheme.outline,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.status});

  final String label;
  final String? status;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    Color fg = t.colorScheme.outline;
    Color bg = t.colorScheme.surfaceContainerHighest;
    if (status == 'rewarded') {
      fg = t.colorScheme.primary;
      bg = t.colorScheme.primary.withValues(alpha: 0.15);
    } else if (status == 'rejected') {
      fg = t.colorScheme.secondary;
      bg = t.colorScheme.secondary.withValues(alpha: 0.12);
    } else if (status == 'completed') {
      fg = t.colorScheme.onSurface.withValues(alpha: 0.85);
      bg = t.colorScheme.outline.withValues(alpha: 0.08);
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        label,
        style: t.textTheme.labelSmall?.copyWith(
          color: fg,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
