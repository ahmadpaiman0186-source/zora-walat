import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/di/app_scope.dart';
import '../../../core/widgets/language_sheet.dart';
import '../../../l10n/app_localizations.dart';
import '../../../models/recharge_package.dart';

/// Primary mobile recharge experience — dark, professional layout.
class RechargeScreen extends StatefulWidget {
  const RechargeScreen({super.key});

  @override
  State<RechargeScreen> createState() => _RechargeScreenState();
}

class _RechargeScreenState extends State<RechargeScreen> {
  final _phone = TextEditingController(text: '0791234567');
  String _operator = 'roshan';
  List<RechargePackage> _packages = [];
  String? _error;
  bool _loading = false;
  String? _orderMsg;

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  String _friendlyError(Object e, AppLocalizations l10n) {
    final s = e.toString();
    if (s.contains('Failed host lookup') ||
        s.contains('SocketException') ||
        s.contains('Connection refused')) {
      return l10n.apiUnreachableRecharge;
    }
    return s.replaceFirst('StateError: ', '').replaceFirst('Exception: ', '');
  }

  Future<void> _loadPackages() async {
    final l10n = AppLocalizations.of(context);
    final phone = _phone.text.trim();
    if (phone.isEmpty) {
      setState(() {
        _error = l10n.enterRecipientError;
        _packages = [];
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
      _orderMsg = null;
    });
    try {
      final api = AppScope.of(context).apiService;
      final list = await api.getRechargePackages(phone, _operator);
      if (!mounted) return;
      final loc = AppLocalizations.of(context);
      setState(() {
        _packages = list;
        if (list.isEmpty) {
          _error = loc.noPackagesForOperator;
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _packages = [];
        _error = _friendlyError(e, AppLocalizations.of(context));
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _buy(RechargePackage p) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
      _orderMsg = null;
    });
    try {
      final api = AppScope.of(context).apiService;
      final r = await api.createRechargeOrder(
        phone: _phone.text.trim(),
        operator: _operator,
        packageId: p.id,
      );
      setState(
        () => _orderMsg = r['message'] as String? ?? l10n.orderPlacedDefault,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.confirmMockSnack(p.label))),
        );
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final surface = t.colorScheme.surfaceContainerHighest;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar.large(
            pinned: true,
            title: Text(l10n.appTitle),
            actions: [
              IconButton(
                tooltip: l10n.wallet,
                icon: const Icon(Icons.account_balance_wallet_outlined),
                onPressed: () => context.push('/wallet'),
              ),
              IconButton(
                tooltip: l10n.language,
                icon: const Icon(Icons.language_rounded),
                onPressed: () => showLanguageSheet(context),
              ),
              IconButton(
                tooltip: l10n.more,
                icon: const Icon(Icons.menu_rounded),
                onPressed: () => context.push('/hub'),
              ),
            ],
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            sliver: SliverList.list(
              children: [
                Text(
                  l10n.rechargeTitle,
                  style: t.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.rechargeHero,
                  style: t.textTheme.bodyMedium?.copyWith(
                    color: t.colorScheme.outline,
                  ),
                ),
                const SizedBox(height: 28),
                Text(
                  l10n.recipientNumber,
                  style: t.textTheme.titleSmall?.copyWith(
                    color: t.colorScheme.outline,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  style: t.textTheme.titleMedium,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: surface,
                    hintText: '07XXXXXXXX',
                    prefixIcon: Icon(Icons.phone_android_rounded, color: t.colorScheme.primary),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: t.colorScheme.primary, width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  l10n.operator,
                  style: t.textTheme.titleSmall?.copyWith(
                    color: t.colorScheme.outline,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    for (final o in AppConstants.mockOperators)
                      _OperatorChip(
                        label: o['label']!,
                        selected: _operator == o['key'],
                        onTap: () => setState(() => _operator = o['key']!),
                      ),
                  ],
                ),
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: FilledButton.icon(
                    onPressed: _loading ? null : _loadPackages,
                    icon: _loading
                        ? SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: t.colorScheme.onPrimary,
                            ),
                          )
                        : const Icon(Icons.inventory_2_outlined),
                    label: Text(_loading ? l10n.loading : l10n.getPackages),
                    style: FilledButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
                if (_loading) ...[
                  const SizedBox(height: 14),
                  const LinearProgressIndicator(),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.red.shade900.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(_error!, style: t.textTheme.bodySmall),
                  ),
                ],
                if (_orderMsg != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _orderMsg!,
                    style: t.textTheme.bodyMedium?.copyWith(
                      color: t.colorScheme.primary,
                    ),
                  ),
                ],
                const SizedBox(height: 32),
                if (_packages.isNotEmpty) ...[
                  Row(
                    children: [
                      Text(
                        l10n.packages,
                        style: t.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        l10n.packageOptionsCount(_packages.length),
                        style: t.textTheme.bodySmall?.copyWith(
                          color: t.colorScheme.outline,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                ],
                for (final p in _packages)
                  _PackageCard(
                    package: p,
                    onBuy: () => _buy(p),
                    busy: _loading,
                  ),
                if (_packages.isEmpty && !_loading && _error == null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      l10n.tapGetPackagesHint,
                      style: t.textTheme.bodySmall?.copyWith(
                        color: t.colorScheme.outline,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OperatorChip extends StatelessWidget {
  const _OperatorChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Material(
      color: selected
          ? t.colorScheme.primary.withValues(alpha: 0.2)
          : t.colorScheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? t.colorScheme.primary : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Text(
            label,
            style: t.textTheme.labelLarge?.copyWith(
              color: selected ? t.colorScheme.primary : t.colorScheme.onSurface,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}

class _PackageCard extends StatelessWidget {
  const _PackageCard({
    required this.package,
    required this.onBuy,
    required this.busy,
  });

  final RechargePackage package;
  final VoidCallback onBuy;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final price = '\$${package.priceUsd.toStringAsFixed(2)}';
    final typeLabel =
        package.type == 'airtime' ? l10n.airtimeLabel : l10n.dataBundleLabel;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: t.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                typeLabel,
                style: t.textTheme.labelMedium?.copyWith(
                  color: t.colorScheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                l10n.amountLabel,
                style: t.textTheme.bodySmall?.copyWith(color: t.colorScheme.outline),
              ),
              const SizedBox(height: 4),
              Text(
                package.label,
                style: t.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 14),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.priceLabel,
                        style: t.textTheme.bodySmall?.copyWith(color: t.colorScheme.outline),
                      ),
                      Text(
                        price,
                        style: t.textTheme.headlineSmall?.copyWith(
                          color: t.colorScheme.secondary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  FilledButton(
                    onPressed: busy ? null : onBuy,
                    style: FilledButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(l10n.buyLabel),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
