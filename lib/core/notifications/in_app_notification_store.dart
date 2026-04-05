import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// Local inbox + hook for future server sync (`serverId`, `revision`).
class InAppNotificationItem {
  InAppNotificationItem({
    required this.id,
    required this.createdAtMs,
    required this.category,
    required this.title,
    required this.body,
    this.payload,
    this.read = false,
    this.serverRevision,
    this.serverId,
    this.dedupeKey,
  });

  final String id;
  final int createdAtMs;
  final String category;
  final String title;
  final String body;
  final String? payload;
  bool read;
  final int? serverRevision;

  /// Cuid from `UserNotification` when merged from API.
  final String? serverId;

  /// Matches server `dedupeKey` / FCM `zw_dedupe` for de-duplication.
  final String? dedupeKey;

  Map<String, dynamic> toJson() => {
        'id': id,
        'createdAtMs': createdAtMs,
        'category': category,
        'title': title,
        'body': body,
        'payload': payload,
        'read': read,
        if (serverRevision != null) 'serverRevision': serverRevision,
        if (serverId != null) 'serverId': serverId,
        if (dedupeKey != null) 'dedupeKey': dedupeKey,
      };

  static InAppNotificationItem fromJson(Map<String, dynamic> m) {
    return InAppNotificationItem(
      id: m['id'] as String? ?? const Uuid().v4(),
      createdAtMs: (m['createdAtMs'] as num?)?.toInt() ??
          DateTime.now().millisecondsSinceEpoch,
      category: m['category'] as String? ?? 'system',
      title: m['title'] as String? ?? '',
      body: m['body'] as String? ?? '',
      payload: m['payload'] as String?,
      read: m['read'] as bool? ?? false,
      serverRevision: (m['serverRevision'] as num?)?.toInt(),
      serverId: m['serverId'] as String?,
      dedupeKey: m['dedupeKey'] as String?,
    );
  }
}

class InAppNotificationStore extends ChangeNotifier {
  InAppNotificationStore(this._prefs);

  final SharedPreferences _prefs;
  static const _key = 'zw_in_app_notifications_v1';
  static const _maxItems = 120;
  final _uuid = const Uuid();

  bool hasDedupeKey(String? key) {
    if (key == null || key.isEmpty) return false;
    return readAll().any((e) => e.dedupeKey == key);
  }

  bool hasServerId(String? serverId) {
    if (serverId == null || serverId.isEmpty) return false;
    return readAll().any((e) => e.serverId == serverId);
  }

  List<InAppNotificationItem> readAll() {
    final raw = _prefs.getString(_key);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => InAppNotificationItem.fromJson(
                Map<String, dynamic>.from(e as Map),
              ))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _write(List<InAppNotificationItem> items) async {
    await _prefs.setString(
      _key,
      jsonEncode(items.map((e) => e.toJson()).toList()),
    );
    notifyListeners();
  }

  Future<InAppNotificationItem> prepend({
    required String category,
    required String title,
    required String body,
    String? payload,
    String? dedupeKey,
    String? serverId,
    int? serverRevision,
    bool initialRead = false,
    int? createdAtMsOverride,
  }) async {
    final cur = readAll();
    if (dedupeKey != null) {
      for (final e in cur) {
        if (e.dedupeKey == dedupeKey) return e;
      }
    }
    if (serverId != null) {
      for (final e in cur) {
        if (e.serverId == serverId) return e;
      }
    }
    final list = readAll();
    final item = InAppNotificationItem(
      id: serverId ?? _uuid.v4(),
      createdAtMs:
          createdAtMsOverride ?? DateTime.now().millisecondsSinceEpoch,
      category: category,
      title: title,
      body: body,
      payload: payload,
      read: initialRead,
      serverId: serverId,
      dedupeKey: dedupeKey,
      serverRevision: serverRevision,
    );
    list.insert(0, item);
    while (list.length > _maxItems) {
      list.removeLast();
    }
    await _write(list);
    return item;
  }

  Future<void> markRead(String id) async {
    final list = readAll();
    var changed = false;
    for (final i in list) {
      if (i.id == id && !i.read) {
        i.read = true;
        changed = true;
      }
    }
    if (changed) await _write(list);
  }

  Future<void> markAllRead() async {
    final list = readAll();
    var changed = false;
    for (final i in list) {
      if (!i.read) {
        i.read = true;
        changed = true;
      }
    }
    if (changed) await _write(list);
  }

  int unreadCount() => readAll().where((e) => !e.read).length;

  /// Merge inbox from API (expects newest-first; iterates oldest-first so newest ends on top).
  Future<void> mergeServerInbox(List<Map<String, dynamic>> rows) async {
    for (final r in rows.reversed) {
      final serverId = r['id'] as String?;
      if (serverId == null || serverId.isEmpty) continue;
      await prepend(
        category: r['category'] as String? ?? 'system',
        title: r['title'] as String? ?? '',
        body: r['body'] as String? ?? '',
        payload: r['payload'] as String?,
        dedupeKey: r['dedupeKey'] as String?,
        serverId: serverId,
        serverRevision: (r['serverRevision'] as num?)?.toInt(),
        initialRead: r['read'] == true,
        createdAtMsOverride: (r['createdAtMs'] as num?)?.toInt(),
      );
    }
  }
}
