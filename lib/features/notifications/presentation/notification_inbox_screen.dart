import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/di/app_scope.dart';
import '../../../core/notifications/in_app_notification_store.dart';
import '../../../core/notifications/notification_payload.dart';
import '../../../core/widgets/language_sheet.dart';
import '../../../l10n/app_localizations.dart';

class NotificationInboxScreen extends StatefulWidget {
  const NotificationInboxScreen({super.key});

  @override
  State<NotificationInboxScreen> createState() => _NotificationInboxScreenState();
}

class _NotificationInboxScreenState extends State<NotificationInboxScreen> {
  List<InAppNotificationItem> _items = const [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _reload();
    });
  }

  void _reload() {
    setState(() {
      _items = AppScope.of(context).notificationStore.readAll();
    });
  }

  IconData _iconFor(String category) {
    switch (category) {
      case 'order':
        return Icons.receipt_long_rounded;
      case 'loyalty':
        return Icons.emoji_events_outlined;
      default:
        return Icons.notifications_none_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final df = DateFormat.MMMd(Localizations.localeOf(context).toString());

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar.large(
            pinned: true,
            title: Text(l10n.notifInboxTitle),
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
              TextButton(
                onPressed: () async {
                  await AppScope.of(context).notificationStore.markAllRead();
                  _reload();
                },
                child: Text(l10n.notifMarkAllRead),
              ),
            ],
          ),
          if (_items.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text(
                    l10n.notifInboxEmpty,
                    textAlign: TextAlign.center,
                    style: t.textTheme.bodyLarge?.copyWith(
                      color: t.colorScheme.outline,
                    ),
                  ),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
              sliver: SliverList.separated(
                itemCount: _items.length,
                separatorBuilder: (_, index) =>
                    SizedBox(height: 12, key: ValueKey('sep-$index')),
                itemBuilder: (context, i) {
                  final item = _items[i];
                  final dt = DateTime.fromMillisecondsSinceEpoch(
                    item.createdAtMs,
                  ).toLocal();
                  final time = '${df.format(dt)} · ${DateFormat.jm().format(dt)}';
                  return TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0.96, end: 1),
                    duration: Duration(milliseconds: 320 + i * 24),
                    curve: Curves.easeOutCubic,
                    builder: (context, scale, child) {
                      return Transform.scale(scale: scale, child: child);
                    },
                    child: Material(
                      color: item.read
                          ? t.colorScheme.surfaceContainerHighest
                              .withValues(alpha: 0.65)
                          : t.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(22),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(22),
                        onTap: () async {
                          await AppScope.of(context).notificationStore.markRead(
                                item.id,
                              );
                          _reload();
                          final loc = payloadToLocation(item.payload);
                          if (loc != null && context.mounted) {
                            context.go(loc);
                          }
                        },
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 18, 16),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: t.colorScheme.primary
                                      .withValues(alpha: 0.14),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Icon(
                                  _iconFor(item.category),
                                  color: t.colorScheme.primary,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.title,
                                      style: t.textTheme.titleSmall?.copyWith(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      item.body,
                                      style: t.textTheme.bodyMedium?.copyWith(
                                        color: t.colorScheme.outline,
                                        height: 1.4,
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      time,
                                      style: t.textTheme.labelSmall?.copyWith(
                                        color: t.colorScheme.outline,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (!item.read)
                                Container(
                                  width: 10,
                                  height: 10,
                                  margin: const EdgeInsets.only(top: 4),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: t.colorScheme.primary,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
