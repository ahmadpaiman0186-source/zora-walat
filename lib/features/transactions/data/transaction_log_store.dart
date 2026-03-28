import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Append-only local audit trail (temporary until backend reconciliation exists).
class TransactionLogStore {
  TransactionLogStore(this._prefs);

  final SharedPreferences _prefs;
  static const _key = 'zw_transaction_log_v1';

  Future<void> append(Map<String, dynamic> entry) async {
    final list = _readRaw();
    entry['at'] = DateTime.now().toUtc().toIso8601String();
    list.insert(0, entry);
    while (list.length > 200) {
      list.removeLast();
    }
    await _prefs.setString(_key, jsonEncode(list));
  }

  List<Map<String, dynamic>> _readRaw() {
    final raw = _prefs.getString(_key);
    if (raw == null || raw.isEmpty) return [];
    final decoded = jsonDecode(raw) as List<dynamic>;
    return decoded
        .map((e) => Map<String, dynamic>.from(e as Map<dynamic, dynamic>))
        .toList();
  }
}
