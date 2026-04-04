import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/auth/unauthorized_exception.dart';
import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/widgets/language_sheet.dart';
import '../../../l10n/app_localizations.dart';
import '../../../models/wallet_balance.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  WalletBalance? _balance;
  String? _error;
  bool _busy = false;
  bool _needsSignIn = false;

  static const _topUpAmounts = [5.0, 10.0, 20.0];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  String _friendlyError(Object e, AppLocalizations l10n) {
    if (e is UnauthorizedException) return l10n.authRequiredMessage;
    final s = e.toString();
    if (s.contains('Failed host lookup') ||
        s.contains('SocketException') ||
        s.contains('Connection refused')) {
      return l10n.apiUnreachableWallet;
    }
    return s.replaceFirst('StateError: ', '').replaceFirst('Exception: ', '');
  }

  Future<void> _refresh() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final b = await AppScope.of(context).apiService.getBalance();
      if (!mounted) return;
      setState(() {
        _balance = b;
        _needsSignIn = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _needsSignIn = e is UnauthorizedException;
        _error = _friendlyError(e, l10n);
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _topUp(double amount) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await AppScope.of(context).apiService.topUpWallet(amount);
      if (!mounted) return;
      final verified = await AppScope.of(context).apiService.getBalance();
      if (!mounted) return;
      setState(() => _balance = verified);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              l10n.topUpSuccessSnack('\$${amount.toStringAsFixed(0)}'),
            ),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _needsSignIn = e is UnauthorizedException;
        _error = _friendlyError(e, l10n);
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final fmt = NumberFormat.currency(
      locale: Localizations.localeOf(context).toString(),
      symbol: r'$',
      decimalDigits: 2,
    );
    final surface = t.colorScheme.surfaceContainerHighest;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar.large(
            pinned: true,
            title: Text(l10n.walletScreenTitle),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_rounded),
              onPressed: () => context.pop(),
            ),
            actions: [
              IconButton(
                tooltip: l10n.language,
                icon: const Icon(Icons.language_rounded),
                onPressed: () => showLanguageSheet(context),
              ),
              IconButton(
                tooltip: l10n.refresh,
                icon: const Icon(Icons.refresh_rounded),
                onPressed: _busy ? null : _refresh,
              ),
            ],
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
            sliver: SliverList.list(
              children: [
                Text(
                  l10n.balanceHeroLabel,
                  style: t.textTheme.bodySmall?.copyWith(
                    color: t.colorScheme.outline,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 12),
                Material(
                  color: surface,
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.account_balance_wallet_rounded,
                              color: t.colorScheme.primary,
                              size: 28,
                            ),
                            const SizedBox(width: 12),
                            Text(
                              l10n.availableLabel,
                              style: t.textTheme.titleSmall?.copyWith(
                                color: t.colorScheme.outline,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        if (_busy && _balance == null)
                          const LinearProgressIndicator()
                        else if (_balance != null)
                          Text(
                            fmt.format(_balance!.balance),
                            style: t.textTheme.headlineLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: t.colorScheme.secondary,
                            ),
                          )
                        else
                          Text('—', style: t.textTheme.headlineMedium),
                        if (_balance != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            _balance!.currency,
                            style: t.textTheme.labelLarge?.copyWith(
                              color: t.colorScheme.outline,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                if (_busy && _balance != null) ...[
                  const SizedBox(height: 12),
                  const LinearProgressIndicator(),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 20),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.red.shade900.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(_error!, style: t.textTheme.bodySmall),
                  ),
                  if (_needsSignIn) ...[
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _busy
                          ? null
                          : () => context
                              .push(AppRoutePaths.signIn)
                              .then((_) => _refresh()),
                      child: Text(l10n.authSignInCta),
                    ),
                  ],
                ],
                const SizedBox(height: 28),
                Text(
                  l10n.quickTopUp,
                  style: t.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.walletTopUpHint,
                  style: t.textTheme.bodySmall?.copyWith(
                    color: t.colorScheme.outline,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    for (var i = 0; i < _topUpAmounts.length; i++) ...[
                      if (i > 0) const SizedBox(width: 10),
                      Expanded(
                        child: _TopUpChip(
                          label: '\$${_topUpAmounts[i].toStringAsFixed(0)}',
                          enabled: !_busy,
                          onTap: () => _topUp(_topUpAmounts[i]),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TopUpChip extends StatelessWidget {
  const _TopUpChip({
    required this.label,
    required this.onTap,
    required this.enabled,
  });

  final String label;
  final VoidCallback onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Material(
      color: t.colorScheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Center(
            child: Text(
              label,
              style: t.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: enabled ? t.colorScheme.primary : t.colorScheme.outline,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
