import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/di/app_scope.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/widgets/language_sheet.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/trust_strip.dart';
import '../data/customer_orders_repository.dart';
import '../domain/order_center_row.dart';
import '../domain/order_sync_source.dart';
import 'order_center_copy.dart';

class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  OrderCenterLoadResult _result = OrderCenterLoadResult.empty;
  bool _loading = true;

  CustomerOrdersRepository get _repo => CustomerOrdersRepository(
        api: AppScope.of(context).apiService,
        local: AppScope.of(context).orderHistory,
        auth: AppScope.authSessionOf(context),
      );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final r = await _repo.loadMerged();
    if (!mounted) return;
    setState(() {
      _result = r;
      _loading = false;
    });
  }

  Future<void> _onRefresh() => _load();

  void _openDetail(OrderCenterRow row) {
    context.pushNamed(
      'orderDetail',
      pathParameters: {'orderId': row.orderId},
      extra: row,
    );
  }

  String _chipLabel(AppLocalizations l10n, String? key) {
    switch (key) {
      case 'delivered':
        return l10n.orderStatusDelivered;
      case 'retrying':
        return l10n.orderStatusRetrying;
      case 'failed':
        return l10n.orderStatusFailed;
      case 'payment_pending':
        return l10n.orderStatusPaymentPending;
      case 'cancelled':
        return l10n.orderStatusCancelled;
      case 'sending':
        return l10n.orderStatusSending;
      case 'preparing':
        return l10n.orderStatusPreparing;
      default:
        return l10n.orderStatusInProgress;
    }
  }

  (Color bg, Color fg, IconData icon) _chipStyle(ThemeData t, String? key) {
    switch (key) {
      case 'delivered':
        return (
          t.colorScheme.primary.withValues(alpha: 0.2),
          t.colorScheme.primary,
          Icons.check_circle_outline_rounded,
        );
      case 'retrying':
        return (
          t.colorScheme.secondary.withValues(alpha: 0.2),
          t.colorScheme.secondary,
          Icons.autorenew_rounded,
        );
      case 'failed':
        return (
          t.colorScheme.error.withValues(alpha: 0.18),
          t.colorScheme.error,
          Icons.support_agent_rounded,
        );
      case 'payment_pending':
        return (
          t.colorScheme.outline.withValues(alpha: 0.2),
          t.colorScheme.outline,
          Icons.schedule_rounded,
        );
      case 'cancelled':
        return (
          t.colorScheme.outline.withValues(alpha: 0.15),
          t.colorScheme.outline,
          Icons.cancel_outlined,
        );
      case 'sending':
        return (
          t.colorScheme.tertiary.withValues(alpha: 0.18),
          t.colorScheme.tertiary,
          Icons.send_rounded,
        );
      case 'preparing':
        return (
          t.colorScheme.primary.withValues(alpha: 0.12),
          t.colorScheme.primary,
          Icons.hourglass_top_rounded,
        );
      default:
        return (
          t.colorScheme.primary.withValues(alpha: 0.12),
          t.colorScheme.onSurface.withValues(alpha: 0.85),
          Icons.radio_button_checked_rounded,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final df = DateFormat.MMMd(Localizations.localeOf(context).toString());
    final auth = AppScope.authSessionOf(context);

    return ListenableBuilder(
      listenable: auth,
      builder: (context, _) {
        return Scaffold(
          body: RefreshIndicator(
            onRefresh: _onRefresh,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverAppBar.large(
                  pinned: true,
                  title: Text(l10n.ordersScreenTitle),
                  leading: IconButton(
                    icon: const Icon(Icons.arrow_back_rounded),
                    onPressed: () => context.pop(),
                  ),
                  actions: [
                    IconButton(
                      tooltip: l10n.supportOrderListHelpTooltip,
                      icon: const Icon(Icons.help_outline_rounded),
                      onPressed: () => context.push(AppRoutePaths.helpCenter),
                    ),
                    IconButton(
                      tooltip: l10n.language,
                      icon: const Icon(Icons.language_rounded),
                      onPressed: () => showLanguageSheet(context),
                    ),
                  ],
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                  sliver: SliverList.list(
                    children: [
                      const TrustStrip(compact: true),
                      const SizedBox(height: 16),
                      if (_result.cloudRefreshFailed && auth.isAuthenticated)
                        _CloudBanner(l10n: l10n),
                      if (_result.cloudRefreshFailed && auth.isAuthenticated)
                        const SizedBox(height: 16),
                      if (_loading)
                        const Padding(
                          padding: EdgeInsets.all(40),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      else if (_result.orders.isEmpty)
                        _EmptyState(l10n: l10n, signedIn: auth.isAuthenticated)
                      else
                        for (final row in _result.orders)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _OrderCard(
                              row: row,
                              l10n: l10n,
                              df: df,
                              theme: t,
                              chipLabel: _chipLabel,
                              chipStyle: _chipStyle,
                              onOpen: () => _openDetail(row),
                            ),
                          ),
                      const SizedBox(height: 24),
                      OutlinedButton.icon(
                        onPressed: () => context.go(AppRoutePaths.hub),
                        icon: const Icon(Icons.home_outlined),
                        label: Text(l10n.successBackHome),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _CloudBanner extends StatelessWidget {
  const _CloudBanner({required this.l10n});

  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Material(
      color: t.colorScheme.errorContainer.withValues(alpha: 0.35),
      borderRadius: BorderRadius.circular(18),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.wifi_off_rounded, color: t.colorScheme.error),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                l10n.ordersCloudRefreshFailed,
                style: t.textTheme.bodySmall?.copyWith(height: 1.45),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.row,
    required this.l10n,
    required this.df,
    required this.theme,
    required this.chipLabel,
    required this.chipStyle,
    required this.onOpen,
  });

  final OrderCenterRow row;
  final AppLocalizations l10n;
  final DateFormat df;
  final ThemeData theme;
  final String Function(AppLocalizations l10n, String? key) chipLabel;
  final (Color bg, Color fg, IconData icon) Function(ThemeData t, String? key)
      chipStyle;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final headline = OrderCenterCopy.forRow(row, l10n).$2;
    final sourceLabel = row.syncSource == OrderSyncSource.account
        ? l10n.ordersSourceAccount
        : l10n.ordersSourceDevice;

    return Material(
      color: theme.colorScheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(22),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          row.orderId,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.2,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.surface.withValues(
                              alpha: 0.55,
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            sourceLabel,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: theme.colorScheme.outline,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusChip(
                    label: chipLabel(l10n, row.trackingStageKey),
                    style: chipStyle(theme, row.trackingStageKey),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                headline,
                style: theme.textTheme.bodyMedium?.copyWith(height: 1.35),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 10),
              Text(
                l10n.ordersLastUpdated(_formatTime(row.updatedAtIso, df)),
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(String? iso, DateFormat df) {
    final s = iso ?? '';
    if (s.isEmpty) return '—';
    try {
      final d = DateTime.parse(s).toLocal();
      return '${df.format(d)} · ${DateFormat.jm().format(d)}';
    } catch (_) {
      return '—';
    }
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({
    required this.label,
    required this.style,
  });

  final String label;
  final (Color bg, Color fg, IconData icon) style;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: style.$1,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(style.$3, size: 16, color: style.$2),
          const SizedBox(width: 6),
          Text(
            label,
            style: t.textTheme.labelMedium?.copyWith(
              color: style.$2,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.l10n,
    required this.signedIn,
  });

  final AppLocalizations l10n;
  final bool signedIn;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          Icon(
            Icons.inventory_2_outlined,
            size: 56,
            color: t.colorScheme.outline.withValues(alpha: 0.65),
          ),
          const SizedBox(height: 20),
          Text(
            l10n.ordersEmptyTitle,
            style: t.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            signedIn ? l10n.ordersEmptyBodySignedIn : l10n.ordersEmptyBody,
            textAlign: TextAlign.center,
            style: t.textTheme.bodyMedium?.copyWith(
              color: t.colorScheme.outline,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            l10n.ordersEmptySupportLine,
            textAlign: TextAlign.center,
            style: t.textTheme.bodySmall?.copyWith(
              color: t.colorScheme.outline.withValues(alpha: 0.85),
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}
